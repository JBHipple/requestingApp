# requestingApp

Frontend is a vanilla html/css/js web page.  The page allows the user to input a request along with some metadata.  The requests are displayed in a sortable list below.  This frontend talks to the backend which is an expressJS api.

Backend is an expressJS api with endpoints to support the functionality of the frontend.  It uses SQLite as the database to store individual requests so they can persist no matter what browser session is viewing the page.

Deploy wherever you like, but make sure to update the main endpoint for the API connection to wherever your expressJS is running.
