#!/bin/bash

docker-compose stop
docker-compose rm -f
docker rmi autovola/apache:latest autovola/analyse:latest autovola/mongo:latest mongo:latest
docker volume rm autovola_dumps
docker load --input containers/images/mongodb.tar
docker tag mongo:latest autovola/mongo:latest
docker load --input containers/images/debian_apache.tar
docker load --input containers/images/ubuntu_analyse.tar
docker-compose up --build -d
