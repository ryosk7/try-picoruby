#include <pico/stdlib.h>

#if defined(R2P2_RP2040JS)
static void
rp2040js_debug_puts(const char *s)
{
  while (*s) {
    putchar_raw(*s++);
  }
}
#endif

//--------------------------------------------------------------------+
// USB CDC
//--------------------------------------------------------------------+

// Invoked when cdc when line state changed e.g connected/disconnected
void tud_cdc_line_state_cb(uint8_t itf, bool dtr, bool rts)
{
  (void) itf;
  (void) rts;

  // TODO set some indicator
  if ( dtr )
  {
    // Terminal connected
#if defined(R2P2_RP2040JS)
    rp2040js_debug_puts("[rp2040js] tud_cdc_line_state_cb dtr=1\n");
#endif
  }else
  {
    // Terminal disconnected
#if defined(R2P2_RP2040JS)
    rp2040js_debug_puts("[rp2040js] tud_cdc_line_state_cb dtr=0\n");
#endif
  }
}

// Invoked when CDC interface received data from host
void tud_cdc_rx_cb(uint8_t itf)
{
  (void) itf;
#if defined(R2P2_RP2040JS)
  rp2040js_debug_puts("[rp2040js] tud_cdc_rx_cb\n");
#endif
}
