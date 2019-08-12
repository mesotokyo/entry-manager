NAME=entrymanager

build:
	mkdir -p files
	rsync -a --exclude=Makefile \
	--exclude=node_modules \
	--exclude='*~' \
	--exclude='*.json' \
	--exclude=/data \
	--exclude=/test \
	--exclude=/docker ../ files/
	cp -a ../package.json files/
	docker build -t entrymanager .

clean:
	rm -rf files/

run:
	docker run -d --name $(NAME) \
		-v $(shell pwd)/data:/var/entrymanager/data \
		-v $(shell pwd)/config.sample.json:/var/entrymanager/config.json \
		-p '2080:3000' --restart=always $(NAME)
shell:
	docker run --rm -ti \
		-v $(shell pwd)/data:/var/entrymanager/data \
		-v $(shell pwd)/config.sample.json:/var/entrymanager/config.json \
		-p '2080:3000' $(NAME) bash


create_sample_db:
	sqlite3 data/data.sqlite < ../sql/create_db.sql
