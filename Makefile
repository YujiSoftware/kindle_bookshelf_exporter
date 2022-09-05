.PHONY: firefox chrome

SOURCE = icon@*.png content.js background.js manifest.json

firefox: $(SOURCE)
	web-ext build

chrome: manifest_v3/background.js manifest_v3/manifest.json $(SOURCE)
	zip -r web-ext-artifacts/kindle_bookshelf_exporter-chrome.zip $(SOURCE)
	zip --junk-paths -r web-ext-artifacts/kindle_bookshelf_exporter-chrome.zip manifest_v3/*
