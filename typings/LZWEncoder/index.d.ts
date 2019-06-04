// Type definitions for ./node_modules/jsgif/LZWEncoder.js
// Project: [LIBRARY_URL_HERE]
// Definitions by: [YOUR_NAME_HERE] <[YOUR_URL_HERE]>
// Definitions: https://github.com/borisyankov/DefinitelyTyped
// LZWEncoder.!ret
declare module "jsgif/LZWEncoder" {
  /**
   * This class handles LZW encoding
   * Adapted from Jef Poskanzer's Java port by way of J. M. G. Elliott.
   * @author Kevin Weiner (original Java version - kweiner@fmsware.com)
   * @author Thibault Imbert (AS3 version - bytearray.org)
   * @author Kevin Kwok (JavaScript version - https://github.com/antimatter15/jsgif)
   * @version 0.1 AS3 implementation
   */
  export default interface LZWEncoder {
    /**
     *
     * @param width
     * @param height
     * @param pixels
     * @param color_depth
     * @return
     */
    new (
      width: number | Array<any>,
      height: number | Array<any>,
      pixels: number | Array<any>,
      color_depth: any
    ): LZWEncoder;
    new (): LZWEncoder;

    /**
     *
     * @param init_bits
     * @param outs
     */

    compress(
      init_bits: number,
      outs: /* LZWEncoder.!ret.compress.!1 */ any
    ): void;

    /**
     * ----------------------------------------------------------------------------
     * @param os
     */
    encode(os: /* LZWEncoder.!ret.compress.!1 */ any): void;
  }
}
