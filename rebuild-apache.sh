#!/bin/bash

docker-compose stop apache
docker-compose rm -f apache
docker rmi autovola/apache:latest
docker rmi debian:latest
docker load --input containers/images/debian_apache.tar
docker tag debian:latest autovola/apache:latest
docker-compose pull apache
docker-compose up --build -d apache
