// Sample Application with ArcGIS API for JavaScript 4.5
// Settlement development of the city of Zurich in 3D dynamically animated over time
// Author: Lisa Staehli
// Project: Cartography Lab 2017
// Date: June-September 2017
// Cartography Lab - ETH Zurich

define([
    "esri/core/declare",

    "esri/Map",
    "esri/views/SceneView",
    "esri/layers/SceneLayer",
    "esri/layers/FeatureLayer",
    "esri/widgets/Home",

    "esri/renderers/SimpleRenderer",
    "esri/symbols/MeshSymbol3D",
    "esri/symbols/FillSymbol3DLayer",

    "esri/widgets/Legend",

    "dojo/dom",
    "dojo/on",
    "dojo/dom-style",
], function (
    declare,
    Map, SceneView, SceneLayer, FeatureLayer, Home,
    SimpleRenderer,
    MeshSymbol3D, FillSymbol3DLayer, Legend,
    dom, on, domStyle) {


    return declare(null, {

        constructor: function () {

        },

        init: function () {

            this.serviceURL = "https://services2.arcgis.com/cFEFS0EWrhfDeVw9/arcgis/rest/services/Zurich_Existing_Buildings_Year/SceneServer";
            this.yearAttribute = "GBAUJ";

            // load a new web scene
            var scene = new Map({
                basemap: "gray",
                ground: "world-elevation"
            });

            // create a view
            var view = new SceneView({
                container: "viewDiv",
                map: scene,
                qualityProfile: "high"
            });

            // environment settings for better visuals (shadows)
            view.environment.lighting.ambientOcclusionEnabled = true;
            view.environment.lighting.directShadowsEnabled = true;

            window.view = view; // for debugging only

            // renderer for already built buildings
            var rendererYearSL = new SimpleRenderer({
                symbol: new MeshSymbol3D({
                    symbolLayers: [new FillSymbol3DLayer({
                        material: { color: "orange" }
                    })]
                })
            })

            // renderer for buildings built at year x
            var rendererYearSL2 = new SimpleRenderer({
                symbol: new MeshSymbol3D({
                    symbolLayers: [new FillSymbol3DLayer({
                        material: { color: "#034e7b" }
                    })]
                })
            })

            // create a scene layer with all other buildings (92%)
            this.buildingsLayer = this.createSceneLayer(
                this.serviceURL,
                1, rendererYearSL, true
            )
            scene.add(this.buildingsLayer);

            // create a second scene layer with all other buildings that is shown with the buildings of the selected year
            this.buildingsLayer2 = this.createSceneLayer(
                this.serviceURL,
                1, rendererYearSL2, true
            )
            scene.add(this.buildingsLayer2);

            // create home widget for scene view
            var homeWidget = new Home({
                view: view
            });
            view.ui.add(homeWidget, "top-left");

            var waterBodies = new FeatureLayer({
                url: 'https://services9.arcgis.com/ZpmTCcECcEOnkrrK/arcgis/rest/services/Zurich_Water_Bodies/FeatureServer',
                elevationInfo: {
                    mode: 'on-the-ground',
                },
                renderer: {
                    type: "simple",
                    symbol: {
                        type: "polygon-3d",
                        symbolLayers: [
                            {
                                type: "water",
                                waveDirection: 260,
                                color: "#034e7b",
                                waveStrength: "moderate",
                                waterbodySize: "medium"
                            }
                        ]
                    }
                }
            });

            scene.add(waterBodies);

            // wait until view is loaded
            view.when(function () {

                // add legend
                var legend = new Legend({
                    view: view,
                    layerInfos: [{
                        layer: this.buildingsLayer,
                        title: "Existing buildings at year x"
                    }, {
                        layer: this.buildingsLayer2,
                        title: "Buildings in construction at year x"
                    }]
                });

                view.ui.add(legend, "bottom-right");

                // add timeline slider (noUISlider: https://refreshless.com/nouislider/)
                var softSlider = document.getElementById('soft');

                noUiSlider.create(softSlider, {
                    start: 1850,
                    connect: "lower",
                    range: {
                        min: 1850,
                        max: 2030
                    },
                    pips: {
                        mode: 'values',
                        values: [1850, 1900, 1920, 1940, 1960, 1980, 1990, 2000, 2005, 2010, 2015, 2030],
                        density: 50
                    },
                    format: wNumb({
                        decimals: 0
                    })
                });

                // trigger timeline animation for first year
                this.timelineAnimation(1850);

                // start timeline animation when user interacts with slider
                softSlider.noUiSlider.on('change', function (values, handle) {
                    this.timelineAnimation(parseInt(values[0]));
                }.bind(this));

                // zoom to Zurich
                // TODO: zoom to another location (retrieve view.camera from console in web browser)
                view.goTo({
                    "position": {
                        "x": 951133.1491238967,
                        "y": 5999621.434980976,
                        "z": 1030.1037597507238,
                        "spatialReference": {
                            "latestWkid": 3857,
                            "wkid": 102100
                        }
                    },
                    "heading": 5.314619878612064,
                    "tilt": 74.10553287910521
                }, {
                    speedFactor: 5, // animation is 5 times slower than default
                    easing: "linear" // easing function to slow down when reaching the target
                }
                );

                // timeline animation
                var buttonPlay = dom.byId("button-play");
                var buttonStop = dom.byId("button-stop");

                // start animation
                on(buttonPlay, "click", function () {
                    // change UI of button
                    domStyle.set(buttonPlay, "display", "none");
                    domStyle.set(buttonStop, "display", "inline-block");

                    var year = this.currentYear + 1;

                    this.timelineInterval = setInterval(function () {
                        // cancel Interval
                        softSlider.noUiSlider.set(year);
                        this.timelineAnimation(year); // trigger timeline animation
                        year += 1; // increase year
                        if (year === 2031) { year = 1850; } // make loop
                    }.bind(this), 1000);

                }.bind(this));

                // stop animation
                on(buttonStop, "click", function () {
                    // change UI of button
                    domStyle.set(buttonPlay, "display", "inline-block");
                    domStyle.set(buttonStop, "display", "none");

                    clearInterval(this.timelineInterval);

                }.bind(this));


            }.bind(this)).otherwise(function (err) {
                console.error(err);
            });

        },

        timelineAnimation: function (year) {
            // animate buildings (show, color) based on current year on timeline
            this.currentYear = year;

            // change displayed year in the UI
            dom.byId("timeline-count").innerHTML = year;

            // define conditions for buildings based on selected year

            this.buildingsLayer.definitionExpression = this.yearAttribute + " IS NOT null AND " + this.yearAttribute + " > 0 AND " + this.yearAttribute + " < " + year + ""; // buildings that are already built in that year
            this.buildingsLayer2.definitionExpression = this.yearAttribute + " IS NOT null AND " + this.yearAttribute + " > 0 AND " + this.yearAttribute + " = " + year + ""; // buildings that have just been built in that year


        },

        createSceneLayer: function (url, opacity, renderer, visible) {
            // construct a scene layer based an input parameters
            return new SceneLayer({
                url: url,
                opacity: opacity,
                renderer: renderer,
                visible: visible,
                popupEnabled: false
            })
        }
    });
});
