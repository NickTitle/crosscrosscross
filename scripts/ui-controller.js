function isFocused(element) {
  return element.classList.contains('focused');
}

export function createUiController({ elements, selectedWorks, state, onAccept = () => {} }) {
  const {
    loadingAmt,
    loadingScreen,
    consentBox,
    acknowledge,
    takeMeBack,
    aboutButton,
    aboutContent,
    contactButton,
    contactContent,
    pressButton,
    pressContent,
    selectedWorksButton,
    selectedWorksContent,
    menuCatcher,
    menuContent,
    shopButton,
    subscribeButton,
    subscribeInput,
    subscribeForm,
  } = elements;

  function showLoadingComplete() {
    loadingAmt.textContent = '100%';
    loadingAmt.classList.add('fastHidden');
    consentBox.classList.add('fade');
    consentBox.classList.remove('hidden');
  }

  function acceptDisclaimer() {
    onAccept();
    document.body.classList.remove('is-loading');
    loadingAmt.classList.add('hidden');
    loadingScreen.classList.add('hiddenLoader');
  }

  function showMenuItem(button, content, shouldShow = true) {
    if (shouldShow) {
      state.menuActive = true;
      button.classList.add('focused');
      if (button !== selectedWorksButton) {
        content.classList.remove('hidden');
      }
      return;
    }

    button.classList.remove('focused');
    if (button !== selectedWorksButton) {
      content.classList.add('hidden');
    }
  }

  function showAbout(shouldShow = true) {
    showMenuItem(aboutButton, aboutContent, shouldShow);
  }

  function showContact(shouldShow = true) {
    showMenuItem(contactButton, contactContent, shouldShow);
  }

  function showPress(shouldShow = true) {
    showMenuItem(pressButton, pressContent, shouldShow);
  }

  function setSelectedWorksVisible(shouldShow = true) {
    selectedWorksContent.classList.toggle('hidden', !shouldShow);
    selectedWorksContent.classList.toggle('fade', shouldShow);

    document.querySelectorAll('.workItem').forEach(element => {
      if (shouldShow) {
        element.classList.add('fade');
        element.classList.add('fastHidden');
        element.classList.remove('hidden');
      } else {
        element.classList.remove('fade');
        element.classList.remove('fastHidden');
        element.classList.add('hidden');
      }
    });

    if (shouldShow) selectedWorks.rearrange();
  }

  function showSelectedWorks(shouldShow = true) {
    showMenuItem(selectedWorksButton, selectedWorksContent, shouldShow);
    setSelectedWorksVisible(shouldShow);
  }

  function showMenu(shouldShow) {
    state.menuActive = shouldShow;
    if (shouldShow) {
      menuCatcher.classList.remove('hidden');
      menuContent.classList.add('fastHidden');
      menuContent.classList.add('fade');
      return;
    }

    menuCatcher.classList.add('hidden');
    menuContent.classList.remove('fastHidden');
    menuContent.classList.remove('fade');

    aboutButton.classList.remove('focused');
    contactButton.classList.remove('focused');
    pressButton.classList.remove('focused');
    selectedWorksButton.classList.remove('focused');
    setSelectedWorksVisible(false);
  }

  function openMenuPanel(button, showPanel) {
    if (!isFocused(button)) {
      if (!state.menuActive) {
        showMenu(true);
      }
      showPanel(true);
      return;
    }

    showMenu(false);
  }

  function submitForm() {
    const formData = new FormData(subscribeForm);

    fetch(subscribeForm.action, {
      method: subscribeForm.method,
      mode: 'no-cors',
      body: formData
    })
      .then(function () {
        subscribeInput.value = '';
      })
      .catch(function (error) {
        console.error('Error submitting form:', error);
      });
  }

  function bindEvents() {
    acknowledge.addEventListener('click', acceptDisclaimer);

    takeMeBack.addEventListener('click', function () {
      document.location = 'https://nicktitle.github.io/meadowtext?text=%20';
    });

    aboutButton.addEventListener('click', function () {
      openMenuPanel(aboutButton, function (shouldShow) {
        showAbout(shouldShow);
        showContact(false);
        showPress(false);
        showSelectedWorks(false);
      });
    });

    contactButton.addEventListener('click', function () {
      openMenuPanel(contactButton, function (shouldShow) {
        showContact(shouldShow);
        showAbout(false);
        showPress(false);
        showSelectedWorks(false);
      });
    });

    pressButton.addEventListener('click', function () {
      openMenuPanel(pressButton, function (shouldShow) {
        showPress(shouldShow);
        showAbout(false);
        showContact(false);
        showSelectedWorks(false);
      });
    });

    selectedWorksButton.addEventListener('click', function () {
      if (!isFocused(selectedWorksButton)) {
        if (!state.menuActive) {
          showMenu(true);
        }
        showSelectedWorks(true);
        showAbout(false);
        showContact(false);
        showPress(false);
      } else {
        showMenu(false);
        showSelectedWorks(false);
      }
    });

    menuCatcher.addEventListener('click', function () {
      showMenu(false);
    });

    shopButton.addEventListener('click', function () {
      const shopLink = document.createElement('a');
      shopLink.target = '_blank';
      shopLink.href = 'https://www.artsy.net/artist/eduardo-enrique';
      shopLink.click();
    });

    subscribeButton.addEventListener('click', submitForm);

    subscribeInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        submitForm();
      }
    });
  }

  return {
    bindEvents,
    showLoadingComplete,
  };
}
