---
myst:
  html_meta:
    "description": "Start a Plone site with collective.glossary, add plone-glossary to a new Volto project, and open your first glossary tooltip with the keyboard."
    "property=og:description": "Start a Plone site with collective.glossary, add plone-glossary to a new Volto project, and open your first glossary tooltip with the keyboard."
    "property=og:title": "Your first glossary tooltip"
    "keywords": "Plone, Volto, glossary, tutorial, tooltip, keyboard"
---

# Your first glossary tooltip

In this tutorial, we will add a glossary to a new Plone site and see the first tooltip.
We will start Plone with `collective.glossary`, create a Volto project with the package, and write a term and a page.
At the end, we will open the tooltip with the keyboard.

(tutorial-requirements)=

## What you need

You need Docker to run Plone.
You also need uv, Node.js, pnpm, Git, and make for the Volto project.
Set them up as the section "System requirements" of [Create a project with Cookieplone](https://6.docs.plone.org/install/create-project-cookieplone.html) describes.

You will work in two terminals and a web browser.

(tutorial-backend)=

## Start Plone with `collective.glossary`

Open a terminal and run the following command.

```shell
docker run --rm --name plone-glossary-backend -p 8080:8080 \
  -e SITE=Plone \
  -e ADDONS="collective.glossary==3.0.2 horse-with-no-namespace" \
  -e PROFILES="collective.glossary:default" \
  plone/server-dev:6.2.3
```

The container installs `collective.glossary` 3.0.2 into Plone 6.2.3.
The package `horse-with-no-namespace` lets `collective.glossary` load on Plone 6.2.
The container then creates a Plone site with the ID `Plone`.

Watch the output of the terminal.
Notice the line `Importing profile collective.glossary:default`.
The site has activated the glossary add-on.
Wait until the terminal shows `Ready to handle requests`.

The site has a user `admin` with the password `admin`.
Keep this terminal open.
The site lives inside the container.
When you stop the container, the site and its content are gone.

(tutorial-project)=

## Create a Volto project

Open a second terminal and run the following command.

```shell
uvx cookieplone frontend_addon
```

Cookieplone asks several questions.
Press {kbd}`Enter` at each question to accept its default answer.
Cookieplone creates the folder `volto-add-on`.

Change into the folder and install the project.

```shell
cd volto-add-on
make install
```

The installation fetches Volto and its dependencies.
It takes a few minutes.

(tutorial-install)=

## Add the package to the project

Add the package to the project's add-on `volto-add-on`.

```shell
pnpm --filter volto-add-on add @bluedynamics/plone-glossary
```

Open the file {file}`packages/volto-add-on/package.json` in an editor.
Find the key `addons`, which holds an empty list.
Add the package to the list:

```json
{
  "name": "volto-add-on",
  "addons": ["@bluedynamics/plone-glossary"]
}
```

The file has more keys.
Change only the list of `addons`, then save the file.
Start Volto.

```shell
make start
```

Wait until the terminal shows `Volto started at 0.0.0.0:3000`.
Open `http://localhost:3000` in your browser.
You see the start page of the new site.
Its heading is "Plone Site."

Click {guilabel}`Log in` in the page header.
Enter `admin` as {guilabel}`Login Name` and `admin` as {guilabel}`Password`.
Click {guilabel}`Log in`.
Notice the toolbar that appears on the left side of the page.

(tutorial-glossary)=

## Create a glossary and a term

In the toolbar, click {guilabel}`Add`, then {guilabel}`Glossary`.
Enter `Glossary` as {guilabel}`Title`.
Click the {guilabel}`Save` button at the top of the toolbar.

The new glossary opens.
Notice the letters A to Z and the message "This glossary has no terms yet."
The package renders this view.

In the toolbar, click {guilabel}`Add`, then {guilabel}`Term`.
Enter `Climate` as {guilabel}`Glossary Term`.
Click into the field {guilabel}`Definition` and type `The average weather over a long time.`
Click {guilabel}`Save`.

The term opens.
It shows its title, its definition, and a link back to the glossary.

(tutorial-page)=

## Write a page

Click the Plone logo in the page header to go to the start page.
In the toolbar, click {guilabel}`Add`, then {guilabel}`Page`.

The cursor is in the title of the new page.
Type `Weather` and press {kbd}`Enter`.
The cursor moves to a new text block.
Type `The climate of a region changes slowly.`
Click {guilabel}`Save`.

The page shows your title and your sentence.
The word "climate" still looks like the rest of the text.

(tutorial-tooltip)=

## Open the tooltip with the keyboard

Reload the page in your browser.
The package loads the terms of the glossary when the page loads.
Notice that the word "climate" now has a dotted underline.

Press {kbd}`Tab` repeatedly until "climate" shows a focus outline.
The focus passes the toolbar and the links of the page header first.

Press {kbd}`Enter`.
A popover opens below the word and shows the definition "The average weather over a long time."
The focus moves into the popover.

Press {kbd}`Escape`.
The popover closes.
The focus is back on the word.

You have added a glossary to a new Plone site and opened its first tooltip with the keyboard.
To stop Volto and Plone, press {kbd}`Ctrl+C` in each terminal.

```{seealso}
- {doc}`/how-to-guides/index` for the next steps in your own project
- {doc}`/concepts/accessibility` for the reasons behind the keyboard behavior
```
