const isMobile = window.matchMedia("(max-width: 700px)").matches;
const toggler = (id, nameToToggle) => { document.getElementById(id).classList.toggle(nameToToggle) };

// sideBar
const sideBarCtrl = document.getElementById('side-bar-control');
if (sideBarCtrl) {
  sideBarCtrl.addEventListener('click', (clickEvent) => {toggler('side-bar-toggle', 'opened')});
}
// end sideBar

// Galleries
let galleryLoading = false;
let loaderContinue = null;

// Zoom
const hideZoom = function () {
  document.getElementById("zoomed-image-window").classList.remove("show");
  document.getElementById("gallery").classList.toggle('hidden');
  if (loaderContinue) {
    loaderContinue();
  }
};

const clickImage = function (img) {
  // set new img src
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
const populateGallery = function (chooseColumn, nodeReadyQueue) {
  if (nodeReadyQueue.awaiting == 0) { // all loaded
    galleryLoading = false;
    return
  }

  if (document.getElementById('gallery').classList.contains('hidden')) {
    // pause
    loaderContinue = () => {
        populateGallery(chooseColumn, nodeReadyQueue)
    };
    return
  }

  if (nodeReadyQueue.queue.length) {
    chooseColumn(nodeReadyQueue.queue.shift());
    nodeReadyQueue.awaiting--;
  }

  setTimeout((() => {
    populateGallery(chooseColumn, nodeReadyQueue);
  }), 100);
};

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

  return columns[minIndex];
};

const nodify = function(imagePaths, nodeReadyQueue) {
  const img = document.createElement("img");

  const div = document.createElement("a");
  div.addEventListener("click", () => { clickImage(imagePaths[1]); });
  div.appendChild(img);

  const image = document.createElement("div")
  image.classList.add("image");
  image.appendChild(div);

  img.addEventListener('load', () => nodeReadyQueue.queue.push(image));
  img.src = imagePaths[0]; // small version
  return image;
};

const buildLoader = function(columns, imagePaths) {
  const nodeReadyQueue = {
    'awaiting': 0,
    'queue': new Array()
  };
  const buildImageNodes = function (quantity) {
    if (quantity <= 0 || imagePaths.length <= 0) {
      return new Array();
    }

    nodify([imagePaths.shift(), imagePaths.shift()], nodeReadyQueue);
    nodeReadyQueue.awaiting++;
    buildImageNodes(quantity-1);
  };

  const chooseColumn = (image) => findShortestColumn(columns)(image);

  return (() => {
    galleryLoading = true; // gallery is now loading N new nodes
    if (imagePaths.length <= 0) {
      window.onscroll = null; // disconnect from scoll event
    }
    buildImageNodes(24)
    populateGallery(chooseColumn, nodeReadyQueue);
  });
};

const makeColumns = function(id) {
  // Returns an array of functions which insert a photo into column 'i'
  if (id <= 0) { // recursive break
    return [];
  }

  const col = document.createElement("div");
  col.classList.add("column");

  const putImageIntoColumn = function (image) {
    window.requestAnimationFrame(() => {
      col.appendChild(image);
    });
  };

  document.getElementById("gallery").appendChild(col);
  return [(image) => putImageIntoColumn(image)].concat(makeColumns(id-1));
};

const setupColumns = function() {
  return isMobile ? makeColumns(2) : makeColumns(4)
};

const initilizeGallery = function(images) {
    const loader = buildLoader(setupColumns(), images);
    loader(); // inital load
    // hook loader to scrolling
    window.onscroll = function(e) {
      const scrollLocation = window.innerHeight + Math.round(window.scrollY);
      if (!(scrollLocation >= document.body.offsetHeight - 400)) {
        return;
      }
      if (!galleryLoading) {
        loader();
      }
    };
};

const clearGallery = function() {
  const gal = document.getElementsByClassName("column");
  if (gal.length) {
    gal[0].remove();
    clearGallery();
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
    initilizeGallery(await doFetch('/list/photos'));
  });
// end photo

// Painting page
} else if (location.pathname == '/paint/') {
  document.addEventListener("DOMContentLoaded", async (event) => {
    initilizeGallery(await doFetch('/list/all'));
    document.getElementById('gal-ctrl-input').addEventListener('change',
        async (event) => {
            clearGallery();
            const toLoad = '/list/' + event.target.value;
            initilizeGallery(await doFetch(toLoad));
        });
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
