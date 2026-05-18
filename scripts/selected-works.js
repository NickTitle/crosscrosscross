export function createSelectedWorks({ firstColumn, secondColumn, dataUrl = 'selected-works.json' }) {
  const works = [];

  function rearrange() {
    firstColumn.innerHTML = '';
    secondColumn.innerHTML = '';

    if (window.innerWidth < 1024) {
      works.forEach(item => firstColumn.appendChild(item));
      return;
    }

    works.forEach((item, index) => {
      if (index % 2) firstColumn.appendChild(item);
      else secondColumn.appendChild(item);
    });
  }

  function createWorkElement(work) {
    const workElem = document.createElement('div');
    workElem.className = 'workItem';
    workElem.classList.add('hidden');

    workElem.dataset.title = work.title;
    workElem.dataset.medium = work.medium;
    workElem.dataset.size = work.size;
    workElem.dataset.year = work.year;

    const img = document.createElement('img');
    img.src = `works/${work.filename}`;
    img.alt = work.title;
    workElem.appendChild(img);

    const dataBlock = document.createElement('div');
    dataBlock.className = 'dataBlock';
    dataBlock.innerHTML =
      work.title + "</br>" +
      work.medium + "</br>" +
      work.size + "</br>" +
      work.year;
    workElem.appendChild(dataBlock);

    return workElem;
  }

  async function load() {
    const response = await fetch(dataUrl);
    const data = await response.json();
    data.works.forEach(work => works.push(createWorkElement(work)));
    rearrange();
  }

  window.addEventListener('resize', rearrange);

  return {
    load,
    rearrange,
  };
}
