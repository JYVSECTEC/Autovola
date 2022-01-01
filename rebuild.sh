#!/bin/bash

docker-compose stop
docker-compose rm -f
docker rmi autovola/apache:latest autovola/analyse:latest autovola/mongo:latest
docker volume rm autovola_dumps
docker pull mongo:4.4.4
docker tag mongo:4.4.4 autovola/mongo:latest
docker pull debian:stable-20210408
docker tag debian:stable-20210408 autovola/apache:latest
docker tag debian:stable-20210408 autovola/analyse:latest
docker-compose up --build -d
