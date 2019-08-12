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
	docker build -t entrymanager .

clean:
	rm -rf files/

run:
	docker run -d --name $(NAME) -p '2080:3000' --restart=always $(NAME)

restart:
	docker stop $(NAME)
	docker rm $(NAME)
	docker run -d --name $(NAME) -p '2080:3000' --restart=always $(NAME)


