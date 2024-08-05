const isMobile = window.matchMedia("(max-width: 600px)").matches;
const toggler = (id, nameToToggle) => { document.getElementById(id).classList.toggle(nameToToggle) };

// sideBar
const sideBarCtrl = document.getElementById('side-bar-control');
if (sideBarCtrl) {
  sideBarCtrl.addEventListener('click', (clickEvent) => {toggler('side-bar-toggle', 'opened')});
}
// end sideBar

// Zoom
const hideZoom = function () {
  document.getElementById("zoomed-image-window").classList.remove("show");
};

const clickImage = function (img) {
  // set new img src
  const is_showing = document.getElementById("zoomed-image");
  is_showing.src = "";
  window.requestAnimationFrame(() => {
    is_showing.src = img;
    document.getElementById("zoomed-image-window").classList.add("show");
  });
};

document.getElementById('zoom-exit').addEventListener('click', hideZoom);
// End Zoom

// Galleries
let galleryLoading = false;

const setupColumns = function() {
  return isMobile ? makeColumns(2) : makeColumns(4)
};

const makeColumns = function(id) {
  if (id <= 0) { // recursive break
    return [];
  }

  const col = document.createElement("div");
  col.classList.add("column");

  if (isMobile) {
    col.style.flexWidth = '50%';
    col.style.maxWidth = '50%';
  }

  document.getElementById("gallery").appendChild(col);
  // Returns an array functions which insert a photo into column 'i'
  return [((image) => {
      window.requestAnimationFrame(() => {
        col.appendChild(image);
      });
  })].concat(
    makeColumns(id-1)
  );
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

const buildPutImage = function (columns) {
  // returns putImage function which place images into balanced colums
  return ((image) => {
    // choose a column an put image in
    // find min height index
    const cols = document.getElementsByClassName("column");
    let minHeight = 1000000000;
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
    columns[minIndex](image);
  });
};

const populateGallery = function (putImage, imagesToLoad) {
  if (imagesToLoad.length <= 0) {
    galleryLoading = false;
    return;
  }

  const image = buildImageNode([imagesToLoad.shift(), imagesToLoad.shift()]);
  putImage(image);
  setTimeout((() => {
    window.requestAnimationFrame(() => {
      populateGallery(putImage, imagesToLoad);
    })
  }), 100);
};

const galleryLoader = function(putImage, images) {

  // slice off quantity of images
  const imagesToLoad = function (quantity) {
    if (quantity <= 0) {
      return [];
    } else if (images.length <= 0) {
      return [];
    }
    return [images.shift(), images.shift()].concat(imagesToLoad(quantity-1));
  };

  return (() => {
    galleryLoading = true;
    if (images.length <= 0) {
      window.onscroll = null;
    }
    populateGallery(putImage, imagesToLoad(24));
  });
};

const initilizeGallery = function(endpoint) {
  fetch(endpoint).then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  }).then((res) => {

    const putImage = buildPutImage(setupColumns());
    const loader = galleryLoader(putImage, res);
    window.onscroll = function(e) {
      const wHeight = window.innerHeight + Math.round(window.scrollY);
      if (!(wHeight >= document.body.offsetHeight - 400)) {
        return;
      }
      if (!galleryLoading) {
        loader();
      }
    };

    loader(); // inital load

  }).catch(error => {
    console.error('Error:', error);
    // put loading image?
  });
};

const clearGallery = function() {
  const gal = document.getElementsByClassName("column");
  if (gal.length) {
    gal[0].remove();
    clearGallery();
  }
};

// Photo page
if (location.pathname == '/photo/') {
  document.addEventListener("DOMContentLoaded", (event) => {
    initilizeGallery('/list/photos');
  });
// end photo

// Painting page
} else if (location.pathname == '/paint/') {
  document.addEventListener("DOMContentLoaded", (event) => {
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
