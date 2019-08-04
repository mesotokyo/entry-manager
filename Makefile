test: clean
	sqlite3 data/data.sqlite < sql/create_db.sql
	./node_modules/mocha/bin/mocha test --timeout 5000

clean:
	sqlite3 data/data.sqlite < sql/delete_db.sql
