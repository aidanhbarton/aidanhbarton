FROM golang:1.22.5 as builder

ENV APP_HOME /go/src/ahbsite

WORKDIR "$APP_HOME"
COPY src/ .

RUN go build -o ahbsite

FROM golang:1.22.5

ENV APP_HOME /go/src/ahbsite
ENV SITE_HOME /opt/aidanhbarton/
RUN mkdir -p "$APP_HOME"
RUN mkdir -p "$SITE_HOME"
WORKDIR "$APP_HOME"

COPY tmpls tmpls
COPY --from=builder "$APP_HOME"/ahbsite $APP_HOME

EXPOSE 5050
CMD ./ahbsite "$SITE_HOME"
