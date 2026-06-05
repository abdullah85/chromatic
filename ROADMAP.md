# Roadmap

A summary of the features planned for.

Note: We cannot inject content scripts into the Google Chrome WebStore.

## Fetch data in Categories Listing

The idea was to integrate a button like ▶️  into the results while viewing categories.

An example category listing is [Workflow & Planning](https://chromewebstore.google.com/category/extensions/productivity/workflow)

There is a challenge we face currently while attempting to inject the content script:

```
  "content_scripts": [
    {
      "js": [
        "scripts/webstore.js"
      ],
      "matches": [
	"https://chromewebstore.google.com/*"
      ]
    }
```
Using the above approach in `manifest.json` does not have the desired effect.

Hence, we need to find an alternate approach to ensure feasibility.

## Fetch data in Search Results

## Save or Bookmark an Extension

### Save or Bookmark an Extension

### Save or Bookmark an Extension in Search Page

### Save or Bookmark an Extension in Listing Page