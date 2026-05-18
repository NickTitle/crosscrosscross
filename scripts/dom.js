function getRequiredElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element: #${id}`);
  }
  return element;
}

export function getAppElements() {
  return {
    loadingAmt: getRequiredElement('loadingAmt'),
    loadingScreen: getRequiredElement('loadingScreen'),
    consentBox: getRequiredElement('consentBox'),
    acknowledge: getRequiredElement('acknowledge'),
    takeMeBack: getRequiredElement('takeMeBack'),
    aboutButton: getRequiredElement('aboutButton'),
    aboutContent: getRequiredElement('about'),
    contactButton: getRequiredElement('contactButton'),
    contactContent: getRequiredElement('contact'),
    pressButton: getRequiredElement('pressButton'),
    pressContent: getRequiredElement('press'),
    selectedWorksButton: getRequiredElement('selectedWorksButton'),
    selectedWorksContent: getRequiredElement('selectedWorks'),
    menuCatcher: getRequiredElement('menuCatcher'),
    menuContent: getRequiredElement('menuContent'),
    shopButton: getRequiredElement('shopButton'),
    subscribeButton: getRequiredElement('subscribeButton'),
    subscribeInput: getRequiredElement('subscribeInput'),
    subscribeForm: getRequiredElement('subscribe-form'),
    worksCol1: getRequiredElement('worksCol1'),
    worksCol2: getRequiredElement('worksCol2'),
  };
}
