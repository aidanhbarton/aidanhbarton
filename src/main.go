package main

import (
	"encoding/json"
	"html/template"
	"log"
	"net/http"
	"os"
	"regexp"
)

type pageData struct {
	Nav bool
  Content string
}

var sitePath string;

func paint(w http.ResponseWriter, r *http.Request, p *pageData) {
  p.Content = "The paintings of Aidan H Barton."
	renderTmpl(w, "paint.html", p)
}

func photo(w http.ResponseWriter, r *http.Request, p *pageData) {
  p.Content = "The photography of Aidan H Barton."
	renderTmpl(w, "photo.html", p)
}

func about(w http.ResponseWriter, r *http.Request, p *pageData) {
  p.Content = "Who is Aidan H Barton? Read about his interesting journy here."
	renderTmpl(w, "about.html", p)
}

func home(w http.ResponseWriter, r *http.Request, p *pageData) {
  p.Content = "Read about Aidan, or look at his work."
	renderTmpl(w, "home.html", p)
}

func index(w http.ResponseWriter, r *http.Request, p *pageData) {
	p.Nav = false
  p.Content = "The personal website of Aidan H Barton. Artist, Engineer, Philosopher."
	renderTmpl(w, "index.html", p)
}

var tmpls = template.Must(template.ParseFiles(
	"tmpls/base.html",
	"tmpls/index.html",
	"tmpls/home.html",
	"tmpls/about.html",
	"tmpls/photo.html",
	"tmpls/paint.html",
	"tmpls/404.html"))

func renderTmpl(w http.ResponseWriter, tmpl string, p *pageData) {
	err := tmpls.ExecuteTemplate(w, tmpl, p)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func handlerWrapper(fn func(http.ResponseWriter, *http.Request, *pageData)) http.HandlerFunc {
	validPath := regexp.MustCompile("^/($|(home|about|photo|paint)/?$)")
	return func(w http.ResponseWriter, r *http.Request) {
		log.Printf("\t%s: %s %s", r.RemoteAddr, r.Method, r.URL.Path)
		m := validPath.MatchString(r.URL.Path)
		if !m {
			http.NotFound(w, r)
			return
		}
		p := new(pageData)
		p.Nav = true
		fn(w, r, p)
	}
}

var validStaticPath = regexp.MustCompile("^(/static/)([a-zA-Z0-9&_/-]+(.css|.js|.png|.jpg|.pdf|.ttf))$")

func handleStatic(w http.ResponseWriter, r *http.Request) {
	log.Printf("\t%s: %s %s", r.RemoteAddr, r.Method, r.URL.Path)
	m := validStaticPath.FindStringSubmatch(r.URL.Path)
	if m == nil {
		http.NotFound(w, r)
		return
	}

	f, err := os.Stat(sitePath+"static/" + m[2])
	if err != nil || f.IsDir() {
		http.NotFound(w, r)
		return
	}

	http.ServeFile(w, r, sitePath+"static/"+m[2])
}

func dirToJSON(path string) []byte {
	var filesToJson []string
	f, err := os.ReadDir(sitePath+path)

	if err != nil {
		log.Printf("Error reading %s: %v", path, err)
		return []byte("")
	}

	for _, file := range f {
		filesToJson = append(filesToJson, "/"+path+file.Name())
	}

	filesAsJson, err := json.Marshal(filesToJson)
	if err != nil {
		log.Printf("Error building Json")
		return []byte("")
	}

	return filesAsJson
}

func buildList() http.HandlerFunc {
	validPath := regexp.MustCompile("^/static/list/(photos|mfa|venice|portraiture|copies)$")
	photoJson := dirToJSON("static/files/portfolio/photo/") 
	mfaJson := dirToJSON("static/files/portfolio/paint/mfa/")
	veniceJson := dirToJSON("static/files/portfolio/paint/venice/")
	portraitureJson := dirToJSON("static/files/portfolio/paint/portraiture/")
	copiesJson := dirToJSON("static/files/portfolio/paint/copies/")

	return func(w http.ResponseWriter, r *http.Request) {
		log.Printf("\t%s: %s %s", r.RemoteAddr, r.Method, r.URL.Path)
		m := validPath.FindStringSubmatch(r.URL.Path)
		if m == nil {
			http.NotFound(w, r)
			return
		}

		switch m[1] {
		case "photos":
			w.Write(photoJson)
		case "mfa":
			w.Write(mfaJson)
		case "venice":
			w.Write(veniceJson)
		case "portraiture":
			w.Write(portraitureJson)
		case "copies":
			w.Write(copiesJson)
		}

	}
}

func main() {
	if len(os.Args) == 1 {
		log.Printf("No site path given, quitting...")
		return
	}
	sitePath = os.Args[1]
	log.Printf("Using site path %s", sitePath)
	http.HandleFunc("/", handlerWrapper(index))
	http.HandleFunc("/home/", handlerWrapper(home))
	http.HandleFunc("/about/", handlerWrapper(about))
	http.HandleFunc("/photo/", handlerWrapper(photo))
	http.HandleFunc("/paint/", handlerWrapper(paint))

	http.HandleFunc("/static/", handleStatic)

	http.HandleFunc("/static/list/", buildList())

	port := ":5050"
	log.Printf("\tServing at 127.0.0.1" + port)
	log.Fatal(http.ListenAndServe(port, nil))
}
