// Type definitions for ./node_modules/jsgif/GIFEncoder.js
// Project: [LIBRARY_URL_HERE]
// Definitions by: [YOUR_NAME_HERE] <[YOUR_URL_HERE]>
// Definitions: https://github.com/borisyankov/DefinitelyTyped
// GIFEncoder.!ret

declare namespace GIFEncoderRet {
  // GIFEncoder.!ret.stream.!ret

  /**
   *
   */
  interface StreamRet {
    /**
     *
     */
    bin: Array<number>;

    getData(): number[];
  }
}

/**
 * This class lets you encode animated GIF files
 * Base class :  http://www.java2s.com/Code/Java/2D-Graphics-GUI/AnimatedGifEncoder.htm
 * @author Kevin Weiner (original Java version - kweiner@fmsware.com)
 * @author Thibault Imbert (AS3 version - bytearray.org)
 * @author Kevin Kwok (JavaScript version - https://github.com/antimatter15/jsgif)
 * @version 0.1 AS3 implementation
 */
declare class GIFEncoder {
  /**
   *
   * @return
   */
  new(): GIFEncoder;

  /**
   * Sets the delay time between each frame, or changes it for subsequent frames
   * (applies to last frame added)
   * int delay time in milliseconds
   * @param ms
   * @param ms
   */
  setDelay(ms: number): void;

  /**
   * Sets the GIF frame disposal code for the last added frame and any
   *
   * subsequent frames. Default is 0 if no transparent color has been set,
   * otherwise 2.
   * @param code
   * int disposal code.
   * @param code
   */
  setDispose(code: any): void;

  /**
   * Sets the number of times the set of GIF frames should be played. Default is
   * 1; 0 means play indefinitely. Must be invoked before the first image is
   * added.
   *
   * @param iter
   * int number of iterations.
   * @return
   * @param iter
   */
  setRepeat(iter: number): void;

  /**
   * Sets the transparent color for the last added frame and any subsequent
   * frames. Since all colors are subject to modification in the quantization
   * process, the color in the final palette for each frame closest to the given
   * color becomes the transparent color for that frame. May be set to null to
   * indicate no transparent color.
   * @param
   * Color to be treated as transparent on display.
   * @param c
   */
  setTransparent(c: any): void;

  /**
   * Sets the comment for the block comment
   * @param
   * string to be insterted as comment
   * @param c
   */
  setComment(c: any): void;

  /**
   * The addFrame method takes an incoming BitmapData object to create each frames
   * @param
   * BitmapData object to be treated as a GIF's frame
   * @param im
   * @param is_imageData
   * @return
   */
  addFrame(im: any, is_imageData?: boolean): boolean;

  /**
   * @description: Downloads the encoded gif with the given name
   * No need of any conversion from the stream data (out) to base64
   * Solves the issue of large file sizes when there are more frames
   * and does not involve in creation of any temporary data in the process
   * so no wastage of memory, and speeds up the process of downloading
   * to just calling this function.
   * @parameter {String} filename filename used for downloading the gif
   * @param filename
   */
  download(filename: string): void;

  /**
   * Adds final trailer to the GIF stream, if you don't call the finish method
   * the GIF stream will not be valid.
   * @return
   */
  finish(): boolean;

  /**
   * * Sets frame rate in frames per second. Equivalent to
   * <code>setDelay(1000/fps)</code>.
   * @param fps
   * float frame rate (frames per second)
   * @param fps
   */
  setFrameRate(fps: any): void;

  /**
   * Sets quality of color quantization (conversion of images to the maximum 256
   * colors allowed by the GIF specification). Lower values (minimum = 1)
   * produce better colors, but slow processing significantly. 10 is the
   * default, and produces good color mapping at reasonable speeds. Values
   * greater than 20 do not yield significant improvements in speed.
   * @param quality
   * int greater than 0.
   * @return
   * @param quality
   */
  setQuality(quality: number): void;

  /**
   * Sets the GIF frame size. The default size is the size of the first frame
   * added if this method is not invoked.
   * @param w
   * int frame width.
   * @param h
   * int frame width.
   * @param w
   * @param h
   */
  setSize(w: number, h: number): void;

  /**
   * Initiates GIF file creation on the given stream.
   * @param os
   * OutputStream on which GIF images are written.
   * @return false if initial write failed.
   * @return
   */
  start(): boolean;

  /**
   *
   * @return
   */
  cont(): boolean;

  /**
   * Retrieves the GIF stream
   * @return
   */
  stream(): GIFEncoderRet.StreamRet;

  /**
   *
   * @param has_start
   * @param is_first
   */
  setProperties(has_start: any, is_first: any): void;
}
