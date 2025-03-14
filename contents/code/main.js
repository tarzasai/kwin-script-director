function log(text) {
  print('tv_director: ' + text);
  console.error('tv_director:', text);
}

const ParkSide = {
  TOP: 'TOP',
  RIGHT: 'RIGHT',
  BOTTOM: 'BOTTOM',
  LEFT: 'LEFT',
}

let titlebarHeight = 0;

function checkTitlebarHeight() {
  if (titlebarHeight <= 0)
    workspace.windowList().filter(w => !w.noBorder).forEach(w => {
      let h = w.clientGeometry.y - w.frameGeometry.y;
      if (h > titlebarHeight)
        titlebarHeight = h;
    });
  if (titlebarHeight > 0)
    console.error(`tv_director: Determined titlebar height as ${titlebarHeight}`);
  else {
    titlebarHeight = 30;
    console.error(`tv_director: Could not determine titlebar height, using default value ${titlebarHeight}`);
  }
}

function calcWorkAreaSize(state) {
  state.workArea = {
    x: state.screen.geometry.x + state.config.paddingLeft,
    y: state.screen.geometry.y + state.config.paddingTop,
    w: state.screen.geometry.width - state.config.paddingLeft - state.config.paddingRight,
    h: state.screen.geometry.height - state.config.paddingTop - state.config.paddingBottom,
  }
}

function calcParkAreaSize(state) {
  state.parkArea = {
    x: 0,
    y: 0,
    w: 0,
    h: 0,
  };
  if (state.config.parkSide === ParkSide.TOP) {
    state.parkArea.x = state.workArea.x;
    state.parkArea.y = state.workArea.y;
    state.parkArea.w = state.workArea.w;
    state.parkArea.h = Math.floor(state.workArea.h * state.config.parkSize / 100);
  } else if (state.config.parkSide === ParkSide.RIGHT) {
    state.parkArea.x = state.workArea.x + state.workArea.w - Math.floor(state.workArea.w * state.config.parkSize / 100);
    state.parkArea.y = state.workArea.y;
    state.parkArea.w = Math.floor(state.workArea.w * state.config.parkSize / 100);
    state.parkArea.h = state.workArea.h;
  } else if (state.config.parkSide === ParkSide.BOTTOM) {
    state.parkArea.x = state.workArea.x;
    state.parkArea.y = state.workArea.y + state.workArea.h - Math.floor(state.workArea.h * state.config.parkSize / 100);
    state.parkArea.w = state.workArea.w;
    state.parkArea.h = Math.floor(state.workArea.h * state.config.parkSize / 100);
  } else if (state.config.parkSide === ParkSide.LEFT) {
    state.parkArea.x = state.workArea.x;
    state.parkArea.y = state.workArea.y;
    state.parkArea.w = Math.floor(state.workArea.w * state.config.parkSize / 100);
    state.parkArea.h = state.workArea.h;
  }
}

function calcMainAreaSize(state) {
  state.mainArea = {
    x: 0,
    y: 0,
    w: 0,
    h: 0,
  };
  if (state.config.parkSide === ParkSide.TOP) {
    state.mainArea.x = state.workArea.x;
    state.mainArea.y = state.parkArea.y + state.parkArea.h;
    state.mainArea.w = state.workArea.w;
    state.mainArea.h = state.workArea.h - state.parkArea.h;
  } else if (state.config.parkSide === ParkSide.RIGHT) {
    state.mainArea.x = state.workArea.x;
    state.mainArea.y = state.workArea.y;
    state.mainArea.w = state.workArea.w - state.parkArea.w;
    state.mainArea.h = state.workArea.h;
  } else if (state.config.parkSide === ParkSide.BOTTOM) {
    state.mainArea.x = state.workArea.x;
    state.mainArea.y = state.workArea.y;
    state.mainArea.w = state.workArea.w;
    state.mainArea.h = state.workArea.h - state.parkArea.h;
  } else if (state.config.parkSide === ParkSide.LEFT) {
    state.mainArea.x = state.parkArea.x + state.parkArea.w;
    state.mainArea.y = state.workArea.y;
    state.mainArea.w = state.workArea.w - state.parkArea.w;
    state.mainArea.h = state.workArea.h;
  }
}

function calcMainWindowSize(state) {
  state.mainWindowSize = {
    x: state.mainArea.x,
    y: state.mainArea.y,
    w: state.mainArea.w,
    h: Math.round(state.mainArea.w / 16 * 9) + titlebarHeight,
  };
  if (state.mainWindowSize.h > state.mainArea.h) {
    state.mainWindowSize.h = state.mainArea.h - titlebarHeight;
    state.mainWindowSize.w = Math.round(state.mainWindowSize.h * 16 / 9);
    if ([ParkSide.TOP, ParkSide.BOTTOM].includes(state.config.parkSide))
      state.mainWindowSize.x = state.mainArea.x + state.mainArea.w - state.mainWindowSize.w;
  }
}

function calcParkedWindowSize(state) {
  if ([ParkSide.TOP, ParkSide.BOTTOM].includes(state.config.parkSide)) {
    state.parkedWindowHeight = state.parkArea.h - titlebarHeight;
    state.parkedWindowWidth = Math.round(state.parkedWindowHeight * 16 / 9);
    if (state.parkedWindowWidth > state.parkArea.w) {
      state.parkedWindowWidth = state.parkArea.w;
      state.parkedWindowHeight = Math.round(state.parkedWindowWidth / 16 * 9) + titlebarHeight;
    }
  } else {
    state.parkedWindowWidth = state.parkArea.w;
    state.parkedWindowHeight = Math.round(state.parkedWindowWidth / 16 * 9) + titlebarHeight;
    if (state.parkedWindowHeight > state.parkArea.h) {
      state.parkedWindowHeight = state.parkArea.h - titlebarHeight;
      state.parkedWindowWidth = Math.round(state.parkedWindowHeight * 16 / 9);
    }
  }
}

function State() {
  this.config = {
    screenNo: readConfig('screenNo', 0),
    parkSide: readConfig('parkSide', ParkSide.LEFT),
    parkSize: readConfig('parkSize', 30),
    paddingTop: readConfig('paddingTop', 0),
    paddingRight: readConfig('paddingRight', 0),
    paddingBottom: readConfig('paddingBottom', 0),
    paddingLeft: readConfig('paddingLeft', 0),
    filter: readConfig('filter', 'mpv'),
    whitelist: readConfig('whitelist', 'LofiGirl, Lofi Girl').split('\\,').map(w => w.trim()),
    arrangeAll: readConfig('arrangeAll', 'Ctrl+Alt+I'),
    raiseFirst: readConfig('raiseFirst', 'Ctrl+Alt+O'),
    raiseLast: readConfig('raiseLast', 'Ctrl+Alt+P'),
  };
  this.screen = workspace.screens[this.config.screenNo];
  calcWorkAreaSize(this);
  calcParkAreaSize(this);
  calcMainAreaSize(this);
  calcMainWindowSize(this);
  calcParkedWindowSize(this);
  // log(JSON.stringify(this, undefined, 2));
}


function Director() {
  this.state = new State();
  this.mainWindow = null;
  this.parkedWindows = [];
  var self = this; // reference for the listeners
  this.listeners = {
    windowAdded: function(win) {
      if (!self.matchkWindow(win) || self.parkedWindows.length >= self.state.maxParkedWindows)
        return;
      // log('Adding window: ' + win.caption);
      let oldMain = self.mainWindow;
      self.mainWindow = win;
      if (oldMain)
        self.parkedWindows.push(oldMain);
      self.moveWindow(win, self.state.mainWindowSize);
      self.arrangeParkedWindows();
    },
    windowRemoved: function(win) {
      if (self.mainWindow === win) {
        // log('Removing main window: ' + win.caption);
        self.mainWindow = self.parkedWindows.shift();
        if (self.mainWindow) {
          self.moveWindow(self.mainWindow, self.state.mainWindowSize);
          self.arrangeParkedWindows();
        }
      } else {
        let index = self.parkedWindows.indexOf(win);
        if (index >= 0) {
          // log('Removing parked window: ' + win.caption);
          self.parkedWindows.splice(index, 1);
          self.arrangeParkedWindows();
        }
      }
    },
    arrangeAll: function() {
      self.mainWindow = null;
      self.parkedWindows = [];
      workspace.windowList().forEach(w => self.listeners.windowAdded(w));
    },
    raiseFirst: function() {
      if (self.parkedWindows.length < 1)
        return;
      // log(`parkFirst ${self.parkedWindows.length}`);
      let oldMain = self.mainWindow;
      self.mainWindow = self.parkedWindows.shift();
      self.parkedWindows.push(oldMain);
      self.moveWindow(self.mainWindow, self.state.mainWindowSize);
      self.arrangeParkedWindows();
    },
    raiseLast: function() {
      if (self.parkedWindows.length < 1)
        return;
      // log(`parkLast ${self.parkedWindows.length}`);
      let oldMain = self.mainWindow;
      self.mainWindow = self.parkedWindows.pop();
      self.parkedWindows.unshift(oldMain);
      self.moveWindow(self.mainWindow, self.state.mainWindowSize);
      self.arrangeParkedWindows();
    },
  };
};

Director.prototype.matchkWindow = function(win) {
  let caption = win.caption.toLocaleLowerCase();
  return caption.includes(this.state.config.filter.toLocaleLowerCase())
    && this.state.config.whitelist.filter(w => caption.includes(w.toLocaleLowerCase())).length <= 0;
}

Director.prototype.moveWindow = function(win, rect) {
  win.frameGeometry = {
    x: rect.x,
    y: rect.y,
    width: rect.w,
    height: rect.h,
  };
}

Director.prototype.arrangeParkedWindows = function() {
  if ([ParkSide.TOP, ParkSide.BOTTOM].includes(this.state.config.parkSide)) {
    // arrange all the parked windows in a single row from left to right
    let maxCols = Math.floor(this.state.parkArea.w / this.state.parkedWindowWidth);
    this.parkedWindows.slice(0, maxCols).forEach((win, col) => this.moveWindow(win, {
      x: this.state.parkArea.x + (col * this.state.parkedWindowWidth),
      y: this.state.parkArea.y,
      w: this.state.parkedWindowWidth,
      h: this.state.parkedWindowHeight,
    }));
  } else {
    // arrange all the parked windows in a single column from top to bottom
    let maxRows = Math.floor(this.state.parkArea.h / this.state.parkedWindowHeight);
    this.parkedWindows.slice(0, maxRows).forEach((win, row) => this.moveWindow(win, {
      x: this.state.parkArea.x,
      y: this.state.parkArea.y + (row * this.state.parkedWindowHeight),
      w: this.state.parkedWindowWidth,
      h: this.state.parkedWindowHeight,
    }));
  }
}

Director.prototype.init = function() {
  this.listeners.arrangeAll();
  workspace.windowAdded.connect(this.listeners.windowAdded);
  workspace.windowRemoved.connect(this.listeners.windowRemoved);
  registerShortcut("ArrangeAll", "Director: Arrange all matching windows", this.state.config.arrangeAll, this.listeners.arrangeAll);
  registerShortcut("RaiseFirst", "Director: raise first parked window", this.state.config.raiseFirst, this.listeners.raiseFirst);
  registerShortcut("RaiseLast", "Director: raise last parked window", this.state.config.raiseLast, this.listeners.raiseLast);
};

try {
  checkTitlebarHeight();
  main = new Director();
  main.init();
} catch (e) {
  log(e);
}
