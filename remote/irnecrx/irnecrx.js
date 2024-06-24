
class Irnecrx @ "xs_irnecrx_destructor" {
	constructor(gpio) @ "xs_irnecrx";

	get address() @ "xs_irnecrx_get_address";
	get command() @ "xs_irnecrx_get_command";

	read() @ "xs_irnecrx_read";
};

export default Irnecrx;
