/*
	Cosine module for Moddable SDK
	output: DAC Channel1 GPIO26
*/

#include "xsmc.h"
#include "driver/dac_cosine.h"

dac_cosine_handle_t chan0_handle = NULL;
dac_cosine_config_t cos0_cfg = {
        .chan_id = DAC_CHAN_0,
        .freq_hz = 1000,	// default frequency
        .clk_src = DAC_COSINE_CLK_SRC_DEFAULT,
        .offset = 0,
        .phase = DAC_COSINE_PHASE_0,
        .atten = DAC_COSINE_ATTEN_DEFAULT,
        .flags.force_set_freq = false,
    };

void xs_cosine(xsMachine *the)
{
	// change default frequency
	if (xsmcArgc) cos0_cfg.freq_hz = xsmcToInteger(xsArg(0));

	dac_cosine_new_channel(&cos0_cfg, &chan0_handle);
}

void xs_cosine_destructor(void *data)
{
}

void xs_cosine_start(xsMachine *the)
{
	if (xsmcArgc) {	// change frequency
		dac_cosine_stop(chan0_handle);
		dac_cosine_del_channel(chan0_handle);
		cos0_cfg.freq_hz = xsmcToInteger(xsArg(0));
		dac_cosine_new_channel(&cos0_cfg, &chan0_handle);
		dac_cosine_start(chan0_handle);
	} else {		// default frequency
		dac_cosine_start(chan0_handle);
	}
}

void xs_cosine_stop(xsMachine *the)
{
	dac_cosine_stop(chan0_handle);
}

void xs_cosine_delete(xsMachine *the)
{
	dac_cosine_del_channel(chan0_handle);
}

