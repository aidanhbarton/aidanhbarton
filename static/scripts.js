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

const setupColumns = function() {
  return isMobile ? makeColumns(2) : makeColumns(4)
};

const makeColumns = function(id) {
  // Returns an array of functions which insert a photo into column 'i'
  if (id <= 0) { // recursive break
    return [];
  }

  const col = document.createElement("div");
  col.classList.add("column");

  const putImgToDOM = function (image) {
    window.requestAnimationFrame(() => {
      col.appendChild(image);
    });
  };

  document.getElementById("gallery").appendChild(col);
  return [(image) => putImgToDOM(image)].concat(makeColumns(id-1));
};

const buildImageNode = function(imagePaths) {
  const img = document.createElement("img");
  img.src = imagePaths[0]; // small version

  const div = document.createElement("a");
  div.addEventListener("click", () => { clickImage(imagePaths[1]); });
  div.appendChild(img);

  const image = document.createElement("div")
  image.classList.add("image");
  image.appendChild(div);
  return image;
};

const columnPicker = function (columns) {
  const cols = document.getElementsByClassName("column");
  return () => {
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
};

const buildPutImage = function (columns) {
  // returns putImage function which place images into colums
  const chooseColumn = columnPicker(columns);
  return ((image) => {
      chooseColumn()(image);
  });
};

const populateGallery = function (putImage, imagesToLoad) {
  if (imagesToLoad.length <= 0) {
    galleryLoading = false;
    return;
  }

  if (document.getElementById('gallery').classList.contains('hidden')) {
    loaderContinue = () => {
        populateGallery(putImage, imagesToLoad)
    };
    return;
  }

  putImage(imagesToLoad.shift());

  setTimeout((() => {
    populateGallery(putImage, imagesToLoad);
  }), 100);
};

const galleryLoader = function(putImage, images) {
  // slice off quantity of images
  // build nodes
  const imagesToLoad = function (quantity) {
    if (quantity <= 0) {
      return [];
    } else if (images.length <= 0) {
      return [];
    }
    return [buildImageNode([images.shift(), images.shift()])].concat(imagesToLoad(quantity-1));
  };

  return (() => {
    galleryLoading = true;
    if (images.length <= 0) {
      window.onscroll = null; // disconnect from scoll event
    }
    populateGallery(putImage, imagesToLoad(24));
  });
};

const initilizeGallery = function(images) {
    const putImage = buildPutImage(setupColumns());
    const loader = galleryLoader(putImage, images);
    loader(); // inital load

    // hook loader to scrolling
    window.onscroll = function(e) {
      const wHeight = window.innerHeight + Math.round(window.scrollY);
      if (!(wHeight >= document.body.offsetHeight - 400)) {
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
