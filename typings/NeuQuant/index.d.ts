// Type definitions for ./node_modules/jsgif/NeuQuant.js
// Project: [LIBRARY_URL_HERE]
// Definitions by: [YOUR_NAME_HERE] <[YOUR_URL_HERE]>
// Definitions: https://github.com/borisyankov/DefinitelyTyped
// NeuQuant.!ret

declare module "jsgif/NeuQuant" {
  /**
   * This class handles Neural-Net quantization algorithm
   * @author Kevin Weiner (original Java version - kweiner@fmsware.com)
   * @author Thibault Imbert (AS3 version - bytearray.org)
   * @author Kevin Kwok (JavaScript version - https://github.com/antimatter15/jsgif)
   * @version 0.1 AS3 implementation
   */
  interface NeuQuant {
    /**
     *
     * @param thepic
     * @param len
     * @param sample
     * @return
     */
    new (
      thepic: Array<any> | number,
      len: Array<any> | number,
      sample: Array<any> | number
    ): NeuQuant;
    /**
     * * Search for BGR values 0..255 (after net is unbiased) and return colour
     *  index
     *  ----------------------------------------------------------------------------
     * @param b
     * @param g
     * @param r
     * @return
     */
    map(b: number, g: number, r: number): number;

    /**
     *
     * @return
     */
    process(): Array<number>;
  }
}
