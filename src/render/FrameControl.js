/*
 * FrameControl provides a mechanism for rendering a new frame only when
 * needed. The goal is to reduce the CPU and GPU usage during times when
 * no visual changes occur. FrameControl in itself is only the 'bookkeeping'
 * part. For this to work, the code that will cause a visual change must do
 * one of two things. Either explicitly request a new frame by calling one of
 *   render.FrameControl.requestFrame();
 *   render.FrameControl.requestFramesUntilTime();
 * or emit one of the events that FrameControl is listening to (see below).
 *
 * FrameControl is disabled by default, meaning frames will be redrawn
 * continuously.
 */

render.FrameControl = {

  // Events from actions that may require a redraw
  appEvents: ['loadfeature'],
  mapEvents: ['change', 'resize'],

  enabled: false, // Deactivated by default

  numRequestedFrames: 0,
  framesRequestedUntilTime: 0, // Timestamp

  init: function() {},

  /*
   * Enables FrameControl.
   * Frames will be rendered only when necessary.
   */
  enable: function() {
    this.enabled = true;
    this.addListeners();
  },

  /*
   * Disables FrameControl.
   * Frames will be rendered continuously.
   */
  disable: function() {
    this.enabled = false;
    this.removeListeners();
  },

  addListeners: function() {
    if (APP && MAP) {
      if (!this.haveAddedAppListeners) {
        for (var i = 0; i < this.appEvents.length; i++) {
          APP.on(this.appEvents[i], this.requestFrame.bind(this));
        }
        this.haveAddedAppListeners = true;
      }
      if (!this.haveAddedMapListeners) {
        for (var j = 0; j < this.mapEvents.length; j++) {
          MAP.on(this.mapEvents[j], this.requestFrame.bind(this));
        }
        this.haveAddedMapListeners = true;
      }
    }
  },

  removeListeners: function() {
    if (this.haveAddedAppListeners) {
      for (var i = 0; i < this.appEvents.length; i++) {
        APP.off(this.appEvents[i], this.requestFrame.bind(this));
      }
      this.haveAddedAppListeners = false;
    }
    if (this.haveAddedMapListeners) {
      for (var j = 0; j < this.mapEvents.length; j++) {
        MAP.off(this.appEvents[j], this.requestFrame.bind(this));
      }
      this.haveAddedMapListeners = false;
    }
  },

  /*
   * Request that a new frame should be rendered.
   */
  requestFrame: function() {
    this.requestFrames(1);
  },

  /*
   * Request that the specified number of frames should be rendered.
   * @param {Number} numFrames The number of frames that should be rendered.
   */
  requestFrames: function(numFrames) {
    if (this.numRequestedFrames < numFrames) {
      this.numRequestedFrames = numFrames;
    }
  },

  /*
   * Request that new frames should be rendered until the specified time.
   *
   * @param {Number} timestamp The end time, in milliseconds (Unix epoch).
   */
  requestFramesUntilTime: function(timestamp) {
    if (this.framesRequestedUntilTime < timestamp) {
      this.framesRequestedUntilTime = timestamp;
    }
  },

  /*
   * Used to check if a frame has been requested.
   * NOTE: This can have the side effect of decreasing the number of requested frames.
   *
   * @return {Boolean} Whether a new frame have been requested
   */
  haveFrameRequest: function() {
    if (!this.enabled) {
      // Constant 'request' for new frames when FrameControl
      // is disabled
      return true;
    }

    if (!this.haveAddedAppListeners ||
        !this.haveAddedMapListeners) {
      this.addListeners();
      return true;
    }

    if (this.numRequestedFrames > 0) {
      this.numRequestedFrames--;
      return true;
    }

    if (Date.now() <= this.framesRequestedUntilTime) {
      return true;
    }

    return false;
  },

  destroy: function() {
    this.removeListeners();
  }
};
