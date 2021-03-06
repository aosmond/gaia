/*global OptionMenu, MockL10n */

'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');

require('/shared/js/option_menu.js');

suite('OptionMenu', function() {
  var options, menu, formHeader, formSection, realL10n;

  suiteSetup(function() {
    options = {
      id: 'menu-fixture',
      header: 'Text Header',
      section: 'Text Section',
      classes: ['class1', 'class2'],
      items: [
        {
          name: 'test',
          method: function(param) {

          },
          params: ['foo']
        },
        {
          l10nId: 'cancel',
          l10nArgs: { test: true }
        }
      ]
    };
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
  });

  setup(function() {
    this.sinon.spy(navigator.mozL10n, 'setAttributes');

    menu = new OptionMenu(options);

    formHeader = menu.form.querySelector('header');
    formSection = menu.form.querySelector('section');
  });
  teardown(function() {
    var fixture = document.getElementById('menu-fixture');

    if (fixture) {
      document.body.removeChild(fixture);
    }
  });

  suite('Instance', function() {

    test('OptionMenu', function() {
      assert.ok(OptionMenu);
      assert.ok(OptionMenu.prototype.show);
      assert.ok(OptionMenu.prototype.hide);
    });

    suite('menu.show()', function() {
      setup(function() {
        this.sinon.spy(menu.form, 'focus');
        menu.show();
      });

      test('appends element to body', function() {
        assert.equal(
          menu.form, document.body.lastElementChild
        );
      });
      test('Focus form to dismiss keyboard', function() {
        sinon.assert.called(menu.form.focus);
      });

      test('Redundant shows have no effect', function() {
        sinon.spy(document.body, 'appendChild');
        menu.show();
        sinon.assert.notCalled(document.body.appendChild);
      });

      suite('menu.hide()', function() {
        setup(function() {
          menu.hide();
        });

        test('hiding is delayed by animation', function() {
          assert.notEqual(menu.form.parentElement, null);
        });

        test('removes element from DOM after transitionend', function() {
          var transitionend =
            new CustomEvent('transitionend', { target: menu.form });
          menu.form.dispatchEvent(transitionend);
          assert.equal(menu.form.parentElement, null);
        });
      });
    });
  });

  suite('Display', function() {
    test('header: text', function() {
      assert.equal(
        formHeader.textContent, 'Text Header'
      );
    });

    test('header: element', function() {
      options.header = document.createElement('header');
      options.header.textContent = 'Element Header';

      menu = new OptionMenu(options);
      formHeader = menu.form.firstElementChild;

      assert.equal(
        formHeader.textContent, 'Element Header'
      );
    });

    test('header: none', function() {
      options.header = null;
      menu = new OptionMenu(options);

      assert.isNull(menu.form.querySelector('header'));
    });


    test('section: text', function() {
      assert.equal(
        formSection.textContent, 'Text Section'
      );
    });

    test('section: element', function() {
      options.section = document.createElement('section');
      options.section.textContent = 'Element Section';

      menu = new OptionMenu(options);
      formSection = menu.form.firstElementChild;

      assert.equal(
        formSection.textContent, 'Element Section'
      );
    });

    test('section: none', function() {
      options.section = null;
      menu = new OptionMenu(options);

      assert.isNull(menu.form.querySelector('section'));
    });

  });

  suite('Options', function() {
    var buttons;
    setup(function() {
      buttons = menu.form.querySelectorAll('button');
    });
    test('Buttons', function() {
      assert.equal(buttons.length, 2);
    });
    test('Button Text', function() {
      assert.equal(buttons[0].textContent, options.items[0].name);
    });
    test('Localized button', function() {
      sinon.assert.calledWith(navigator.mozL10n.setAttributes, buttons[1],
        options.items[1].l10nId, options.items[1].l10nArgs);
    });
    test('classes', function() {
      assert.ok(menu.form.classList.contains('class1'));
      assert.ok(menu.form.classList.contains('class2'));
    });
  });

  suite('Behaviours', function() {
    test('Fat fingering does not hide menu', function() {
      menu.show();
      menu.form.click();
      assert.equal(
        menu.form, document.body.lastElementChild
      );
    });
  });

});
