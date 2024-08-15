package main

import (
	"encoding/json"
	"html/template"
	"log"
	"net/http"
	"os"
	"regexp"
)

type prefetchData struct {
	URL string
	As  string
}

type pageData struct {
	Nav     bool
	Content string
	Prefetch *[]prefetchData
}

var sitePath string
var aboutPrefetch *[]prefetchData = &[]prefetchData{{URL: "/static/files/profile.avif", As: "image"}}
var homePrefetch *[]prefetchData = &[]prefetchData{
	{URL: "/static/files/portfolio/photo/_6220011.avif", As: "image"},
	{URL: "/static/files/portfolio/photo/_7180037.avif", As: "image"},
	{URL: "/static/files/portfolio/paint/mfa/_7260042.avif", As: "image"},
}
var indexPrefetch *[]prefetchData = &[]prefetchData{{URL: "/static/files/cover.avif", As: "image"}}

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
	p.Prefetch = aboutPrefetch
	renderTmpl(w, "about.html", p)
}

func home(w http.ResponseWriter, r *http.Request, p *pageData) {
	p.Content = "Read about Aidan, or look at his work."
	p.Prefetch = homePrefetch
	renderTmpl(w, "home.html", p)
}

func index(w http.ResponseWriter, r *http.Request, p *pageData) {
	p.Nav = false
	p.Content = "The personal website of Aidan H Barton. Artist, Engineer, Philosopher."
	p.Prefetch = indexPrefetch
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

	w.Header().Add("Content-Security-Policy",
		"default-src 'self' https://aidanhbarton.me/; object-src 'none'; form-action 'none'")

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
		p.Prefetch = nil
		fn(w, r, p)
	}
}

func fetchDir(path string) []string {
	var fileList []string
	f, err := os.ReadDir(sitePath + "/" + path)
	if err != nil {
		log.Panicf("Error reading %s: %v", path, err)
	}

	for _, file := range f {
		fileList = append(fileList, "/"+path+file.Name())
	}

	return fileList
}

func toJSON(sJson []string) []byte {
	var bJson []byte
	bJson, err := json.Marshal(sJson)
	if err != nil {
		log.Panicf("Fatal error initializing JSONs: %v", err)
	}
	return bJson
}

type jsonLists struct {
	Photos      []byte
	Mfa         []byte
	Venice      []byte
	Portraiture []byte
	Copies      []byte
	All         []byte
}

func buildJSONLists(j *jsonLists) {
	photosPath := "static/files/portfolio/photo/"
	paintPath := "static/files/portfolio/paint/"
	paintPathURIs := [4]string{"mfa", "2024", "2023", "copies"}

	j.Photos = toJSON(fetchDir(photosPath))
	j.Mfa = toJSON(fetchDir(paintPath + "/mfa/"))
	j.Venice = toJSON(fetchDir(paintPath + "/2023/"))
	j.Portraiture = toJSON(fetchDir(paintPath + "/2024/"))
	j.Copies = toJSON(fetchDir(paintPath + "/copies/"))

	var allPaintList []string
	var curDirList []string

	for _, uri := range paintPathURIs {
		curDirList = fetchDir(paintPath + "/" + uri + "/")
		allPaintList = append(allPaintList, curDirList...)
	}

	j.All = toJSON(allPaintList)
}

func buildListHandler() http.HandlerFunc {
	validPath := regexp.MustCompile("^/list/(photos|all|mfa|2023|2024|copies)$")
	jsonified := new(jsonLists)
	buildJSONLists(jsonified)

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
			w.Write(jsonified.Photos)
		case "mfa":
			w.Write(jsonified.Mfa)
		case "2023":
			w.Write(jsonified.Venice)
		case "2024":
			w.Write(jsonified.Portraiture)
		case "copies":
			w.Write(jsonified.Copies)
		case "all":
			w.Write(jsonified.All)
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
