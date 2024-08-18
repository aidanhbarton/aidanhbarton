const isMobile = window.matchMedia("(max-width: 700px)").matches;
const toggler = (id, nameToToggle) => { document.getElementById(id).classList.toggle(nameToToggle) };

// sideBar
const sideBarCtrl = document.getElementById('side-bar-control');
if (sideBarCtrl) {
  sideBarCtrl.addEventListener('click', (clickEvent) => {toggler('side-bar-toggle', 'opened')});
}
// end sideBar

// Galleries
let loaderContinue = null;
let scrollYSave = 0;

// Zoom
const hideZoom = function () {
  document.getElementById("zoomed-image-window").classList.remove("show");
  document.getElementById("gallery").classList.toggle('hidden');
  window.scrollTo(0, scrollYSave);
  if (loaderContinue) {
    loaderContinue();
  }
};

const clickImage = function (img) {
  // set new img src
  scrollYSave = window.scrollY;
  const is_showing = document.getElementById("zoomed-image");
  is_showing.src = "";
  window.requestAnimationFrame(() => {
    is_showing.src = img;
    document.getElementById("zoomed-image-window").classList.add("show");
    document.getElementById("gallery").classList.toggle('hidden');
  });
};

const zoomBox = document.getElementById('zoom-exit');
if (zoomBox) {
  zoomBox.addEventListener('click', hideZoom);
}
// End Zoom

const findShortestColumn = function (columns) {
  const cols = document.getElementsByClassName("column");
  // choose a column an put image in
  // find min height index
  let minHeight = Number.MAX_SAFE_INTEGER;
  let minIndex = 0;
  let index = 0;
  for (let col of cols) {
    if (!col.lastChild) {
      minIndex = index;
      break;
    }
    let h = col.lastChild.offsetTop
    h += col.lastChild.offsetHeight ? col.lastChild.offsetHeight : 380;
    if (h < minHeight) {
      minIndex = index;
      minHeight = h;
    }
    index++;
  }

  return minIndex;
};

const populateGallery = function (nodeIndex, nodeQueue, columns) {
    loaderContinue = null;
    if (nodeIndex >= nodeQueue.length) {
        return
    }

    if (document.getElementById('gallery').classList.contains('hidden')) {
      // pause
      loaderContinue = () => populateGallery(nodeIndex, nodeQueue, columns);
      return
    }

    columns[findShortestColumn()](nodeQueue[nodeIndex]);

    nodeIndex++;
    setTimeout(() => populateGallery(nodeIndex, nodeQueue, columns), 25);
};

const initilizeGallery = function() {
    const loader = document.getElementById("loader")
    if (loader) { 
      loader.remove();
    }

    let columns;

    if (isMobile) {
        columns = new Array(2);
    } else {
        columns = new Array(4);
    }

    const gallery = document.getElementById("gallery");
    for (let i = 0; i < columns.length; i++) {
        const col = document.createElement("div");
        col.classList.add("column");
        gallery.appendChild(col);
        columns[i] = (imageNode) => window.requestAnimationFrame(() => col.appendChild(imageNode));
    }

    return columns
};

const nodify = function(imagePaths, nodesLoaded, nodeQueue) {
  const img = document.createElement("img");
  img.addEventListener('load', () => {
    nodesLoaded[0]++;
    if (nodesLoaded[0] >= nodeQueue.length) {
        populateGallery(0, nodeQueue, initilizeGallery());
    }
  });

  const div = document.createElement("a");
  div.addEventListener("click", () => { clickImage(imagePaths[1]); });
  div.appendChild(img);

  const image = document.createElement("div")
  image.classList.add("image");
  image.appendChild(div);

  img.src = imagePaths[0]; // small version
  return image;
};

const load = function(imagePaths) {
  const nodeQueue = new Array(imagePaths.length/2);
  const nodesLoaded = new Array(1);
  nodesLoaded[0] = 0;

  for (let i = 0; i < imagePaths.length; i += 2) {
    nodeQueue[i/2] = nodify([imagePaths[i], imagePaths[i+1]], nodesLoaded, nodeQueue);
  }

};

const clearGallery = function() {
  const columns = document.getElementsByClassName("column");
  while (columns.length) {
    columns[0].remove();
  }
  window.scrollTo(0, 0);
};

const doFetch = function(endpoint) {
  return fetch(endpoint).then((response) => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  }).catch(error => {
    console.error('Error:', error);
    // ERROR!! need to handle this! Redirect to a default error page
    return '';
  });
};

// Photo page
if (location.pathname == '/photo/') {
  document.addEventListener("DOMContentLoaded", async (event) => {
    load(await doFetch('/list/photos'));
  });
// end photo

// Painting page
} else if (location.pathname == '/paint/') {
  document.addEventListener("DOMContentLoaded", async (event) => {
    document.getElementById('gal-ctrl-input').addEventListener('change',
        async (event) => {
            clearGallery();
            const toLoad = '/list/' + event.target.value;
            load(await doFetch(toLoad));
        });
    load(await doFetch('/list/all'));
  });
// end Painting

// About page
} else if (location.pathname == '/about/') {
  const clickAboutToggle = function(clickEvent) {
    if (clickEvent.target.classList.contains('selected')) {return;}
    toggler('profile', 'selected');
    toggler('artist-statement', 'selected');
  };
  document.getElementById('profile').addEventListener('click', clickAboutToggle);
  document.getElementById('artist-statement').addEventListener('click', clickAboutToggle);
}
// end About
