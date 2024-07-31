FROM golang:1.22.5 as builder

ENV APP_HOME /go/src/aidanhbarton

WORKDIR "$APP_HOME"
COPY src/ .

RUN go build -o aidanhbarton

FROM golang:1.22.5

ENV APP_HOME /go/src/aidanhbarton
RUN mkdir -p "$APP_HOME"
WORKDIR "$APP_HOME"

COPY src/tmpls tmpls
COPY src/static static
COPY --from=builder "$APP_HOME"/aidanhbarton $APP_HOME

EXPOSE 5000
CMD ["./aidanhbarton"]
