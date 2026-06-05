# Chromatic Extensions Analytics

Chromatic is a user driven analytics system that lives within the Browser as a Google Chrome extension. In addition to providing complete control to the user, it alleviates manual effort by storing, analyzing and exporting the results. This also ensures accuracy on the given date that the user interacts with the extension while visiting the relevant official sites.

# Roadmap

Check [ROADMAP.md](ROADMAP.md) for more details and the overview is as below:

* Fetch data for number of ratings, number of users in categories listing.
* Fetch data for number of ratings, number of users in search results.
* Save or Bookmark an extension to store its details when in search, listing or extension page.
* Use Chromatic icon in search results, listings, extension page for clarity.
* The user should be able to create new categories, in addition to the 18 provided by Google.
* The user can add multiple user-defined categories for any extension saved by the user.
* A sidebar as well as full page for viewing saved extensions for a particular category.
* Feature to export the stored extensions, mainly in CSV format.
* Allow user to initiate automatic recording of extensions on button click.

Unfortunately Google Chrome WebStore does not allow injecting content scripts and we need to look for alternatives.

# Summary

Chromatic allows the user to review various Google Chrome extensions via the Google Web Store while the required data points are stored with minimal user intervention. The required extension analytics can be obtained from the previous actions. Essentially, retain all the benefits of collecting the data points for Google Extensions while reducing the effort.
