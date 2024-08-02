const isMobile = window.matchMedia("(max-width: 600px)").matches;

// NavBar
function toggle_side_bar() {
  const toToggle = document.getElementById("side-bar-toggle");
  toToggle.classList.toggle("opened");
}
// end NavBar

// Zoom
const hideZoom = function () { 
  document.getElementById("zoomed-image-window").style.visibility = "hidden"; 
};

const clickImage = function (img) {  
  // set new img src
  const is_showing = document.getElementById("zoomed-image");
  is_showing.src = "";

  window.requestAnimationFrame(() => {
    is_showing.src = img;

    // zoom window visibility update
    const zoom_window = document.getElementById("zoomed-image-window");
    if (zoom_window.style.visibility != "visible") {
    zoom_window.style.visibility = "visible";
    zoom_window.animate([
      { transform: "translateY(150px)" },
      { transform: "translateY(0px)" },
    ], { duration: 250, iterations: 1});
    zoom_window.animate([
      { opacity: "0%" },
      { opacity: "100%" },
    ], { duration: 100, iterations: 1});
    }
  });
} 
// End Zoom

// About Tabs
let selected_tab = 'profile'
function select_tab(tab) {
  if (!tab) { 
    return; 
  }
  
  new_tab_element = document.getElementById(tab + "-tab");
  new_text_element = document.getElementById(tab + "-text");
  selected_tab_element = document.getElementById(selected_tab + "-tab");
  selected_text_element = document.getElementById(selected_tab + "-text");
  
  if (new_tab_element && new_text_element) {
    selected_tab_element.classList.remove('selected');
    new_tab_element.classList.add('selected');
    selected_text_element.style.display = "none";
    new_text_element.style.display = "block";
    selected_tab = tab;    
  }
}
// End About Tabs

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

  const a = document.createElement("a");
  a.setAttribute("onclick", "clickImage('"+ imagePaths[1] +"')");
  a.appendChild(img);
    
  const image = document.createElement("div")
  image.classList.add("image");
  image.appendChild(a);
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
      const h = col.lastChild.offsetTop + col.lastChild.offsetHeight;
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
if (document.getElementById('photo')) {
  document.addEventListener("DOMContentLoaded", (event) => {
    initilizeGallery('/static/list/photos');
  });
// end photo

// Painting page
} else if (document.getElementById('paint')) {
  document.addEventListener("DOMContentLoaded", (event) => {
    initilizeGallery('/static/list/mfa');
  });
}

const selectGallery = function(name) {
  const selected = document.getElementsByClassName("selected")[0];
  const newSelected = document.getElementById(name+"-title");
  selected.classList.toggle("selected");
  newSelected.classList.toggle("selected");
  clearGallery();
  initilizeGallery('/static/list/' + name );
};
// end Painting
