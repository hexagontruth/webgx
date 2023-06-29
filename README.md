Webgx
=========
By Graham

A WebGPU player.

## Quick start

1. Clone the repo
2. Install dependencies with e.g. `npm install` or equivs
3. Run `npm start`

The server will run on port 8080 by default. Override with `PORT` environment variable.

## Overview

I adapted this from my (fairly bare-bones) WebGL shader art stack to a) familiarize myself with WebGPU, and b) continue my practice of doing shader art and related in a more modular way than e.g. just cloning and modifying single-page demos. It is obscure and idiosyncratic and I do not recommend anyone using it for any reason. Plz consult the WebGPU docs and write your own thing.

In a nutshell, we load a "program" file specified either by the URL path (the new way) or the `program` or `p` query parameter (the old way), referencing a JavaScript file in the `/lib` or `/user` directories that defines a set of WebGPU pipelines, buffers, and associated logic to perform a sequence of steps and &mdash; presumably &mdash; output the result of the same as a series of frames to the on-page canvas. The shaders are defined in separate files using a fairly rudimentary `#include` system, according to a directory schema that made sense when I first started using it a few years ago. Unlike in my WebGL thing, which just used JSON, the program files here are full JavaScript files  with access to a program object passed in from the player. Consult the `Program` class file for a full list of program configuration fields and their default values, as well as methods that can be invoked on the program instance. A rudimentary understanding of the possibilities of the same can be gleaned from the example shaders in the `/lib` directory.

To run e.g. the raymarching example, simply load the following URL (assuming default port settings &c.):

```http://localhost:8080/examples/raymarcher```

As noted, there are separate directories for built-in programs and shaders (`/lib`) and user-defined ones (`/user`). The server process is required to retrieve resources from both of these potential paths as well as to perform recording operations via ffmpeg and frame saving. Both directories however resolve from the `/data` web path internally, so one can conversely store program files in e.g. a `/public/data` directory, forego recording tools, and simply run the compiled assets directly via a static server from `/public`.

There is very little error handling being performed and the player is not in any way robust. It simply plays properly-formatted program and shader files for output or &mdash; within reason &mdash; interactive display. Probably.

At the moment there is no compute shader functionality. Adding this is my next order of business. This will probably also involve refactoring the whole buffer system into something a bit more modular and general-purpose.

Consult the `App` class for information on keyboard and button commands, and the (client) `Config` class for information on e.g. URL parameters and persistent settings.