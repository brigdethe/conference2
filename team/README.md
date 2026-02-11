# Team Section Partial

This folder contains a standalone, ready-to-integrate "Team" section partial.

## Directory Structure

-   `views/partials/team.ejs`: The EJS partial file for the team section.
-   `public/css/`: Contains all necessary CSS files (external and inline).
-   `public/js/`: Contains all necessary JavaScript files (external and inline).

## Integration Instructions

1.  **Copy the Partial**:
    -   Copy `views/partials/team.ejs` to your project's partials directory (e.g., `views/partials/`).

2.  **Copy Assets**:
    -   Copy the contents of `public/css/` to your project's CSS directory (e.g., `public/css/` or `external/css/`).
    -   Copy the contents of `public/js/` to your project's JS directory (e.g., `public/js/` or `external/js/`).

3.  **Include the Partial**:
    -   In your main EJS file (e.g., `index.ejs` or `about.ejs`), include the partial:
        ```ejs
        <%- include('partials/team') %>
        ```
        *(Adjust the path `'partials/team'` based on where you placed the file relative to your view)*

4.  **Reference Assets**:
    -   Ensure your main layout or head partial references the CSS files.
    -   Ensure your main layout or scripts partial references the JS files.

    **CSS Example (in `<head>`):**
    ```html
    <link href="css/style-68eee3b7aa1d9628fd1f8ee0.css" rel="stylesheet" type="text/css">
    <!-- Include inline styles if not already present in your global styles -->
    <link href="css/inline/style-1.css" rel="stylesheet" type="text/css">
    ...
    ```

    **JS Example (before `</body>`):**
    ```html
    <script src="js/script-68eee3b7aa1d9628fd1f8ee0.js" type="text/javascript"></script>
    <script src="js/script-ajax-libs-gsap.js" type="text/javascript"></script>
    <!-- Include other scripts as needed -->
    ```

## Notes

-   **Images**: The partial currently uses CDN links for images. You can keep them or replace them with local images if preferred.
-   **Dependencies**: This section relies on GSAP for animations (included in the JS files).
