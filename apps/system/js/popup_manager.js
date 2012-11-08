/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

var PopupManager = {
  _currentPopup: {},
  _currentOrigin: '',
  _endTimes: 0,
  _startTimes: 0,

  throbber: document.getElementById('popup-throbber'),

  overlay: document.getElementById('dialog-overlay'),

  popupContainer: document.getElementById('popup-container'),

  container: document.getElementById('frame-container'),

  screen: document.getElementById('screen'),

  closeButton: document.getElementById('popup-close'),

  errorTitle: document.getElementById('popup-error-title'),

  errorMessage: document.getElementById('popup-error-message'),

  errorReload: document.getElementById('popup-error-reload'),

  errorBack: document.getElementById('popup-error-back'),

  init: function pm_init() {
    this.title = document.getElementById('popup-title');
    window.addEventListener('mozbrowseropenwindow', this);
    window.addEventListener('mozbrowserclose', this);
    window.addEventListener('appwillclose', this);
    window.addEventListener('appopen', this);
    window.addEventListener('appterminated', this);
    window.addEventListener('home', this);
    window.addEventListener('keyboardhide', this);
    window.addEventListener('keyboardchange', this);
    this.closeButton.addEventListener('click', this);
    this.errorReload.addEventListener('click', this);
    this.errorBack.addEventListener('click', this);
  },

  open: function pm_open(frame, origin, title) {
    // Only one popup per origin at a time.
    // If the popup is being shown, we swap frames.
    if (this._currentPopup[origin]) {
      this.container.removeChild(this._currentPopup[origin]);
      delete this._currentPopup[origin];
    }

    // Reset overlay height
    this.setHeight(window.innerHeight - StatusBar.height);

    this._currentPopup[origin] = frame;

    var popup = this._currentPopup[origin];
    var dataset = popup.dataset;
    dataset.frameType = 'popup';
    dataset.frameName = name;
    dataset.frameOrigin = origin;
    dataset.frameTitle = title;

    // this seems needed, or an override to origin in close()
    this._currentOrigin = origin;

    this.container.appendChild(popup);

    this.screen.classList.add('popup');

    popup.addEventListener('mozbrowsererror', this);
    popup.addEventListener('mozbrowserloadend', this);
    popup.addEventListener('mozbrowserloadstart', this);
    popup.addEventListener('mozbrowserlocationchange', this);
  },

  close: function pm_close(evt) {
    if (evt && (!'frameType' in evt.target.dataset ||
        evt.target.dataset.frameType !== 'popup'))
      return;

    var self = this;
    this.popupContainer.addEventListener('transitionend', function wait(event) {
      self.popupContainer.removeEventListener('transitionend', wait);
      self.screen.classList.remove('popup');
      self.popupContainer.classList.remove('disappearing');
      self.container.removeChild(self._currentPopup[self._currentOrigin]);
      delete self._currentPopup[self._currentOrigin];
    });

    this.popupContainer.classList.add('disappearing');

    // We just removed the focused window leaving the system
    // without any focused window, let's fix this.
    window.focus();
  },

  backHandling: function pm_backHandling() {
    if (!this._currentPopup[this._currentOrigin])
      return;

    this.close();
  },

  isVisible: function pm_isVisible() {
    return (this._currentPopup[this._currentOrigin] != null);
  },

  setHeight: function pm_setHeight(height) {
    if (this.isVisible())
      this.overlay.style.height = height + 'px';
  },

  handleEvent: function pm_handleEvent(evt) {
    switch (evt.type) {
      case 'click':
        switch (evt.target) {
          case this.closeButton:
            this.backHandling();
            break;

          case this.errorBack:
            this.backHandling();
            break;

          case this.errorReload:
            this.container.classList.remove('error');
            delete this._currentPopup[this._currentOrigin].dataset.error;
            this._currentPopup[this._currentOrigin].reload(true);
            break;
        }
        break;

      case 'mozbrowserloadstart':
        this.throbber.classList.add('loading');
        break;

      case 'mozbrowserloadend':
        this.throbber.classList.remove('loading');
        break;

      case 'mozbrowserlocationchange':
        evt.target.dataset.url = evt.detail;
        break;

      case 'mozbrowsererror':
        this._currentPopup[evt.target.dataset.frameOrigin].dataset.error = true;
        this.showError();
        break;

      case 'mozbrowseropenwindow':
        var detail = evt.detail;
        var openerType = evt.target.dataset.frameType;
        var openerOrigin = evt.target.dataset.frameOrigin;

        // Only app frame is allowed to launch popup
        if (openerType !== 'window')
          return;

        // <a href="" target="_blank"> links should opened outside the app
        // itself and fire an activity to be opened into a new browser window.
        if (detail.name === '_blank') {
          new MozActivity({ name: 'view',
                          data: { type: 'url', url: detail.url }});
          return;
        }

        this.throbber.classList.remove('loading');
        var popupTitle = this.getTitleFromUrl(detail.url, openerOrigin);
        this.title.textContent = popupTitle;

        var frame = detail.frameElement;
        frame.dataset.url = detail.url;

        this.container.classList.remove('error');
        this.open(frame, openerOrigin, popupTitle);

        break;

      case 'mozbrowserclose':
        this.close(evt);
        break;

      case 'home':
        // Reset overlay height before hiding
        this.setHeight(window.innerHeight - StatusBar.height);
        this.hide(this._currentOrigin);
        break;

      case 'appwillclose':
        if (!this._currentPopup[evt.detail.origin])
          return;

        this.hide(evt.detail.origin);
        break;

      case 'appopen':
        this._currentOrigin = evt.detail.origin;
        this.show();
        break;

      case 'appterminated':
        if (!this._currentPopup[evt.detail.origin])
          return;
        this.close(evt.detail.origin);
        break;

      case 'keyboardchange':
        this.setHeight(window.innerHeight -
          StatusBar.height - evt.detail.height);
        break;

      case 'keyboardhide':
        this.setHeight(window.innerHeight - StatusBar.height);
        break;
    }
  },

  showError: function pm_showError() {
    if (!('error' in this._currentPopup[this._currentOrigin].dataset)) {
      this.container.classList.remove('error');
      return;
    }

    var contentOrigin = this._currentPopup[this._currentOrigin].dataset.url;

    if (AirplaneMode.enabled) {
      this.errorTitle.textContent = _('airplane-is-on');
      this.errorMessage.textContent = _('airplane-is-turned-on', {name: contentOrigin});
    } else if (!navigator.onLine) {
      this.errorTitle.textContent = _('network-connection-unavailable');
      this.errorMessage.textContent = _('network-error', {name: contentOrigin});
    } else {
      this.errorTitle.textContent = _('error-title', {name: contentOrigin});
      this.errorMessage.textContent = _('error-message', {name: contentOrigin});
    }
    this.container.classList.add('error');
  },

  getTitleFromUrl: function pm_getTitleFromUrl(url, origin) {
    if (url.indexOf(origin) === 0) {
      return WindowManager.getCurrentDisplayedApp().manifest.name;
    } else {
      return url.split('//')[0] + '//' + url.split('//')[1].split('/')[0];
    }
  },

  getPopupFromOrigin: function pm_getPopupFromOrigin(origin) {
    return this._currentPopup[origin];
  },

  show: function pm_show() {
    if (!this._currentPopup[this._currentOrigin])
      return;


    this.showError();
    this.screen.classList.add('popup');
    
    var popup = this._currentPopup[this._currentOrigin];
    this.title.textContent = popup.dataset.frameTitle;
    popup.hidden = false;
  },

  hide: function pm_hide(origin) {
    if (!this._currentPopup[origin])
      return;

    this.screen.classList.remove('popup');
    this._currentPopup[origin].hidden = true;
  }
};

PopupManager.init();
