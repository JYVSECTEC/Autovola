# Autovola
Autovola is a dockerized system built as a platform, where users can upload their memory dumps and corresponding ISF files. Users can then run different Volatility 3 plugins to the dumps and see their output in a page where the plugins output can be filtered using regex. E.g. user can filter processes using PID, PPID or process name and then the page will only display data containing that information. Currently Autovola supports analysis of memory dumps taken from Windows or Linux systems.

Autovola has 3 different types of containers:
1. **MongoDB**: Hosts MongoDB database where all the data from dumps is stored. Each dump has its own document in either `windows_pluginresults` or `linux_pluginresults` table depending on the memory dump. Documents store data like plugins output, user created tags and dump description.
2. **Analyse**: Analyse containers run Volatility 3 plugins to memory dumps and send the output to MongoDB container's database. Apache container commands these containers by giving jobs to them. Jobs are either running a plugin to a dump or clearing Volatility 3 cache in case a new ISF is uploaded to the system. Analyse containers amount can be raised (By default only 1 is spawned).
3. **Apache**: Maintains web GUI and API. It commands the analyse containers as described above. If user has selected several plugins to be executed, some of them will wait in queue if there is less analyse containers than plugins that were selected, since single analyse container can only run 1 plugin at a time. If user has selected plugin to be executed, Apache container goes through analyse containers one by one and asks each if they are occupied. If analyse container is not occupied, it will be assigned with a plugin to run and a target dump. If analyse container is occupied, Apache container waits a while and moves to next analyse container. Apache container will continue doing this until the plugin run queue is walked through. 

Autovola does not support Volatility 3 utilites like volshell or process dumping. Practically you can run selected plugins without parameters to memory dumps. The system should be addressed as a centralized storage for memory dumps, where users can do upper level analysis by filtering the data they are interested in. E.g. users can upload bunch of dumps from different systems to Autovola and then they can check which of these dumps contain artifact of a specific malware. This way they can determine which of the systems have been infected. 

# Important things to know
1. **Autovola was not implemented with security in mind!** Autovola is product of a thesis where learning was high priority and time spent on development was limited. Autovola is meant to be run in a safe virtual environment that is not exploitable from internet. The web GUI does not contain any sort of authentication. If you upload memory dump to Autovola and run plugins to it, anybody with access to the service can view the same data as you. Because of this you cannot download back any of the dumps that have been uploaded to Autovola. The system likely also has several other security related issues. **It is recommended to only run Autovola in a safe network**.

2. There is no size limit for ISF files and memory dumps uploaded to Autovola. Also the system does not implement any checks for the files that are uploaded, so you can practically upload anything to it. From web GUI you can delete files uploaded as memory dumps, but not ISF files.

3. Autovola is quite resource intensive and the analysis containers may sometimes crash, especially if they are given insufficient amount of RAM. If the container crashes, it will just restart, but if it was running plugin to a certain memory dump when the crash happened, the plugin's progress is gone and you will just have to rerun the plugin to that dump again.

4. You can view analyse and apache containers logs with Docker Compose: `sudo docker-compose logs -f analyse apache`. These logs should show any errors that may have occurred during file uploads or when running Volatility 3 plugins to memory dumps. You can also display mongodb container's logs in case of database related issues.

5. If plugin's output is over 16 MB, it cannot be stored into database due to MongoDB's [BSON document size limit](https://docs.mongodb.com/manual/reference/limits/#mongodb-limit-BSON-Document-Size). Currently no workaround has not been implemented to Autovola. Also the plugin selection menu does not show error icon if this happens when storing some plugin's output.

6. Plugin selection menu does not currently have an icon, which would imply that plugin is being run to memory dump. Instead it will just show the default blue info icon while plugin is in run queue or being run. So if another user has tasked Autovola to run some plugin to dump, you cannot detect it from GUI until the plugin has been ran.

## Installation
1. Start by installing Docker using Docker's own documentation if Docker is not installed already:
<https://docs.docker.com/engine/install/>
2. Next install Docker Compose using Docker's documentation:
<https://docs.docker.com/compose/install/>
3. Install Git:
```shell
sudo apt-get update
sudo apt-get install git
```
4. Clone Autovola's repository with Git:
```shell
git clone https://github.com/JYVSECTEC/Autovola
```
5. (**Optional but highly recommended!**) Modify [env](.env) file by following these steps:
- It is strongly advised to change passwords and usernames from default values especially if you are intending to run this service on external network. 
- By default one analysis machine is created and it is given **4 GB** of RAM. You can change the amount of RAM that single analysis machine uses by modifying value of this [variable](.env#L16) (2 GB should be considered minimum). 
- You can increase amount of analysis machines by modifying value of [this variable](.env#L15). There is no maximum limit for the analysis machines, but each of them reserve the same amount of RAM that was specified in previous step.

6. Run rebuild.sh from Autovola's base directory (Make sure you are in the Autovola base directory when running this command):
```shell
sudo ./rebuild.sh
```
This shell script loads saved docker images, builds them and starts all the services. You can use the same script to delete, rebuild and start all the services if needed.
If you see error: **cgroups: cgroup mountpoint does not exist: unknown** you can temporarily fix it with commands:
```shell
sudo mkdir /sys/fs/cgroup/systemd
sudo mount -t cgroup -o none,name=systemd cgroup /sys/fs/cgroup/systemd
```

# Author

Author: JYVSECTEC/Tuomo Viljakainen  
More information: [jyvsectec.fi](https://jyvsectec.fi)
