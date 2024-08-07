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
	Nav     bool
	Content string
}

var sitePath string

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

func addHeaders(w http.ResponseWriter) {
	w.Header().Add("Strict-Transport-Security", "max-age=63072000; includeSubdomains")

	w.Header().Add("Content-Security-Policy", "default-src 'self' https://aidanhbarton.me/; object-src 'none'; form-action 'none'")

	w.Header().Add("X-Frame-Options", "DENY")
	w.Header().Add("X-Content-Type-Options", "nosniff")
	w.Header().Add("Referrer-Policy", "strict-origin-when-cross-origin")
}

func handlerWrapper(fn func(http.ResponseWriter, *http.Request, *pageData)) http.HandlerFunc {
	validPath := regexp.MustCompile("^/($|(home|about|photo|paint)/?$)")
	return func(w http.ResponseWriter, r *http.Request) {
		addHeaders(w)
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

func dirToJSON(path string) ([]byte, error) {
	var filesToJson []string
	f, err := os.ReadDir(sitePath + "/" + path)

	if err != nil {
		log.Printf("Error reading %s: %v", path, err)
		return nil, err
	}

	for _, file := range f {
		filesToJson = append(filesToJson, "/"+path+file.Name())
	}

	filesAsJson, err := json.Marshal(filesToJson)
	if err != nil {
		log.Printf("Error building Json")
		return nil, err
	}

	return filesAsJson, nil
}

func sendList(w http.ResponseWriter, path string) {
	leJsone, err := dirToJSON(path)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Write([]byte(leJsone))
}

func buildListHandler() http.HandlerFunc {
	validPath := regexp.MustCompile("^/list/(photos|all|mfa|venice|portraiture|copies)$")

	return func(w http.ResponseWriter, r *http.Request) {
		addHeaders(w)
		w.Header().Add("Content-Type", "text/plain")

		log.Printf("\t%s: %s %s", r.RemoteAddr, r.Method, r.URL.Path)
		m := validPath.FindStringSubmatch(r.URL.Path)
		if m == nil {
			http.NotFound(w, r)
			return
		}

		switch m[1] {
		case "photos":
			sendList(w, "static/files/portfolio/photo/")
		case "mfa":
			sendList(w, "static/files/portfolio/paint/mfa/")
		case "venice":
			sendList(w, "static/files/portfolio/paint/venice/")
		case "portraiture":
			sendList(w, "static/files/portfolio/paint/portraiture/")
		case "copies":
			sendList(w, "static/files/portfolio/paint/copies/")
		case "all":
			sendList(w, "static/files/portfolio/paint/venice/")
		}

	}
}

func main() {
	if len(os.Args) == 1 {
		log.Printf("No web root path given, quitting...")
		return
	}
	sitePath = os.Args[1]
	log.Printf("Using web root path %s", sitePath)
	http.HandleFunc("/", handlerWrapper(index))
	http.HandleFunc("/home/", handlerWrapper(home))
	http.HandleFunc("/about/", handlerWrapper(about))
	http.HandleFunc("/photo/", handlerWrapper(photo))
	http.HandleFunc("/paint/", handlerWrapper(paint))

	http.Handle("/static/", http.FileServer(http.Dir(".")))

	http.HandleFunc("/list/", buildListHandler())

	port := ":5050"
	log.Printf("\tServing at 127.0.0.1" + port)
	log.Fatal(http.ListenAndServeTLS(port, "cert/fullchain.pem", "cert/privkey.pem", nil))
}
