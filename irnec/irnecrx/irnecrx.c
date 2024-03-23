/*
    Moddable SDK Module: Receive IR NEC code
    based on: espressif/esp-idf/examples/peripherals/rmt/ir_nec_transceiver
*/

#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "xsmc.h"
#include "driver/rmt_rx.h"

// NEC timing spec
#define NEC_LEADING_CODE_DURATION_0  9000
#define NEC_LEADING_CODE_DURATION_1  4500
#define NEC_PAYLOAD_ZERO_DURATION_0  560
#define NEC_PAYLOAD_ZERO_DURATION_1  560
#define NEC_PAYLOAD_ONE_DURATION_0   560
#define NEC_PAYLOAD_ONE_DURATION_1   1690
#define NEC_REPEAT_CODE_DURATION_0   9000
#define NEC_REPEAT_CODE_DURATION_1   2250

// Saving NEC decode results
static uint16_t s_nec_code_address;
static uint16_t s_nec_code_command;

// Check whether a duration is within expected range
#define IR_NEC_DECODE_MARGIN 200 
static inline bool nec_check_in_range(uint32_t signal_duration, uint32_t spec_duration)
{
    return (signal_duration < (spec_duration + IR_NEC_DECODE_MARGIN)) &&
           (signal_duration > (spec_duration - IR_NEC_DECODE_MARGIN));
}

// Check whether a RMT symbol represents NEC logic zero
static bool nec_parse_logic0(rmt_symbol_word_t *rmt_nec_symbols)
{
    return nec_check_in_range(rmt_nec_symbols->duration0, NEC_PAYLOAD_ZERO_DURATION_0) &&
           nec_check_in_range(rmt_nec_symbols->duration1, NEC_PAYLOAD_ZERO_DURATION_1);
}

// Check whether a RMT symbol represents NEC logic one
static bool nec_parse_logic1(rmt_symbol_word_t *rmt_nec_symbols)
{
    return nec_check_in_range(rmt_nec_symbols->duration0, NEC_PAYLOAD_ONE_DURATION_0) &&
           nec_check_in_range(rmt_nec_symbols->duration1, NEC_PAYLOAD_ONE_DURATION_1);
}

// Decode RMT symbols into NEC address and command
static bool nec_parse_frame(rmt_symbol_word_t *rmt_nec_symbols)
{
    rmt_symbol_word_t *cur = rmt_nec_symbols;
    uint16_t address = 0;
    uint16_t command = 0;
    bool valid_leading_code = nec_check_in_range(cur->duration0, NEC_LEADING_CODE_DURATION_0) &&
                              nec_check_in_range(cur->duration1, NEC_LEADING_CODE_DURATION_1);
    if (!valid_leading_code) {
        return false;
    }
    cur++;
    for (int i = 0; i < 16; i++) {
        if (nec_parse_logic1(cur)) {
            address |= 1 << i;
        } else if (nec_parse_logic0(cur)) {
            address &= ~(1 << i);
        } else {
            return false;
        }
        cur++;
    }
    for (int i = 0; i < 16; i++) {
        if (nec_parse_logic1(cur)) {
            command |= 1 << i;
        } else if (nec_parse_logic0(cur)) {
            command &= ~(1 << i);
        } else {
            return false;
        }
        cur++;
    }
    // save address and command
    s_nec_code_address = address;
    s_nec_code_command = command;
    return true;
}

// Check whether the RMT symbols represent NEC repeat code
static bool nec_parse_frame_repeat(rmt_symbol_word_t *rmt_nec_symbols)
{
    return nec_check_in_range(rmt_nec_symbols->duration0, NEC_REPEAT_CODE_DURATION_0) &&
           nec_check_in_range(rmt_nec_symbols->duration1, NEC_REPEAT_CODE_DURATION_1);
}


static bool example_rmt_rx_done_callback(rmt_channel_handle_t channel, const rmt_rx_done_event_data_t *edata, void *user_data)
{
    BaseType_t high_task_wakeup = pdFALSE;
    QueueHandle_t receive_queue = (QueueHandle_t)user_data;
    // send the received RMT symbols to the parser task
    xQueueSendFromISR(receive_queue, edata, &high_task_wakeup);
    return high_task_wakeup == pdTRUE;
}

void xs_irnecrx_destructor(void *data)
{
}

rmt_channel_handle_t rx_channel = NULL;   
rmt_receive_config_t receive_config = {};
QueueHandle_t receive_queue = NULL;

void xs_irnecrx(xsMachine *the)
{
    // create RMT RX channel
    rmt_rx_channel_config_t rx_channel_cfg = {
        .clk_src = RMT_CLK_SRC_DEFAULT,
        .resolution_hz = 1000000, // 1MHz resolution, 1 tick = 1us
        .mem_block_symbols = 64, // amount of RMT symbols that the channel can store at a time
        .gpio_num = 0,      // RX IR gpio pin number
    };

    // set RX IR gpio pin
    if (xsmcArgc) rx_channel_cfg.gpio_num = xsmcToInteger(xsArg(0));

    // set rmt_receive_config_t receive_config -the following timing requirement is based on NEC protocol
    receive_config.signal_range_min_ns = 1250;     // the shortest duration for NEC signal is 560us, 1250ns < 560us, valid signal won't be treated as noise
    receive_config.signal_range_max_ns = 12000000; // the longest duration for NEC signal is 9000us, 12000000ns > 9000us, the receive won't stop early
    
    // get rmt_channel_handle_t rx_channel
    rmt_new_rx_channel(&rx_channel_cfg, &rx_channel);

    // register RX done callback
    receive_queue = xQueueCreate(1, sizeof(rmt_rx_done_event_data_t));
    assert(receive_queue);
    rmt_rx_event_callbacks_t cbs = {
        .on_recv_done = example_rmt_rx_done_callback,
    };
    rmt_rx_register_event_callbacks(rx_channel, &cbs, receive_queue);

    // enable RMT RX channels
    rmt_enable(rx_channel);
    
}

void xs_irnecrx_read(xsMachine *the)
{
    int result = 0;
    // save the received RMT symbols
    rmt_symbol_word_t raw_symbols[64]; // 64 symbols should be sufficient for a standard NEC frame
    rmt_rx_done_event_data_t rx_data;
    // ready to receive
    rmt_receive(rx_channel, raw_symbols, sizeof(raw_symbols), &receive_config);  
    // wait for RX done signal
    if (xQueueReceive(receive_queue, &rx_data, pdMS_TO_TICKS(1000)) == pdPASS) {
    // parse the receive symbols and print the result
    switch (rx_data.num_symbols) {
        case 34: // NEC normal frame
            if (nec_parse_frame(rx_data.received_symbols)) {
                result = 3;
            }
            break;
        case 2: // NEC repeat frame
            if (nec_parse_frame_repeat(rx_data.received_symbols)) {
                result = 2;
            }
            break;
        default: // Unknown NEC frame
            result = 1;
            break;
        }
    }
    xsmcSetInteger(xsResult, result);
}

void xs_irnecrx_get_address(xsMachine *the)
{
	xsmcSetInteger(xsResult, s_nec_code_address);
}

void xs_irnecrx_get_command(xsMachine *the)
{
	xsmcSetInteger(xsResult, s_nec_code_command);
}
