/** @jsx React.DOM */
"use strict";

$(function() {

  /**
   * Routing
   */

  Path.map("#/instagram").to(function() { console.log("YESH") });
  /**
   * Internal Helpers
   */

  /*
   * Partition a `list` with int `partitions` partitions, with
   * `per` items per partition
   */
  function partition(list, per, partitions) {
    partitions = partitions || 2;

    var partitioned = [];
    for (var i = 0; i < partitions; i++) {
      partitioned[i] = [];
    }

    for (var i = 0; i * per < list.length; i++) {
      var p = i % partitions,
              ipos = i * per;
      partitioned[p] = partitioned[p].concat(list.slice(ipos, ipos + per));
    }

    return partitioned;
  }

  /***************
   * Instagram API
   */
  var instaFetch = {
    clientId: "57dbff39f8dc4b659e6489ac6dd68b45",
    apiUrl: "https://api.instagram.com/v1",

    fetchByTag: function(tag) {
      // Fetch the media given the provided tag
      var params = $.param({client_id: this.clientId, callback: "?"});
      //return $.getJSON(this.apiUrl + "/tags/" + tag + "/media/recent?" + params)
      return $.ajax({
        url: this.apiUrl + "/tags/" + tag + "/media/recent?" + params,
        dataType: "jsonp"});
    }
  };


  /************
   * Navigation
   */

  var NavBar = React.createClass({
    render: function() {
      return (
         <nav>
	   <div id="nav-buttons" className="nav-panel">
	     <a href="#/countries"><img src={EAConfig.images.africa} /></a>
	     <a href="#/photographers"><img src={EAConfig.images.photographer} /></a>
	     <a href="#/search"><img src={EAConfig.images.search} /></a>
	     <a href="#/about"><img src={EAConfig.images.about} /></a>
	    </div>
           <h1><a href="/"><span className="everyday">Everyday</span>Africa</a></h1>
	   <div id="share-buttons" className="nav-panel">
	     <a href="#/instagram"><img src={EAConfig.images.instagram} /></a>
	     <a href="#/twitter"><img src={EAConfig.images.twitter} /></a>
	     <a href="#/facebook"><img src={EAConfig.images.facebook} /></a>
	     <a href="#/tumblr"><img src={EAConfig.images.tumblr} /></a>
	   </div>
         </nav>);

    }
  });
  var NavButton = React.createClass({
    render: function() {
      return (<a className="nav-button" onClick={this.handleClick} href="#">
                {this.props.src}
              </a>);
    },

    handleClick: function(e) {
      e.preventDefault();
    }
  });

  /********
   * Images
   */

  // The gallery of ALL images
  var Gallery = React.createClass({
    getInitialState: function() {
      return {data: []};
    },

    componentWillMount: function() {
      instaFetch.fetchByTag(this.props.tag)
        .done(function(d) {
            this.setState({
	      data: d.data.map(function(media) {
		var img = media.images.low_resolution;
		return {
		  id: media.id,
		  url: img.url,
		  width: img.width,
		  height: img.height};
	      })
	    });
          }.bind(this))
        .fail(function(d) {
            alert("Failed to fetch tagged photos")
          });

      this.state.tumblrData = TumblrVars.Posts.Photos.map(function(photo, i) {
	function sizedProp(prop) {
	  return photo[prop + "500"];
	};

	return {
	  id: i,
	  url: sizedProp('photoUrl'),
	  width: sizedProp('photoWidth'),
	  height: sizedProp('photoHeight')};
      });
    },

    render: function() {
      // Divide the images which fall on the left and the right
      var imageGroups = partition(this.state.data, 3),
          width = window.innerWidth,
          sideLength = 0.125 * width,
          centerLength = 0.25 * width;

      return (<div className="gallery">
                <GalleryColumn position="left" imageLength={sideLength} data={imageGroups[0]} />
                <GalleryColumn position="center" imageLength={centerLength} data={this.state.tumblrData} />
                <GalleryColumn position="right" imageLength={sideLength} data={imageGroups[1]} />
              </div>);
    }
  });

  // A column of images
  var GalleryColumn = React.createClass({
    render: function() {
      var classes = React.addons.classSet({
        'gallery-column': true,
        'left-column': this.props.position === "left",
        'right-column': this.props.position === "right",
        'center-column': this.props.position === "center"
      });

      return (<div className={classes}>
                {this.props.data.map(function(d) {
                  var isPortrait = d.height > d.width,
                      classes = React.addons.classSet({
                    'tagged-image': true,
                    image: true,
                    portrait: isPortrait,
                    landscape: !isPortrait});

                  return <TaggedImage key={d.id} className={classes} imageLength={this.props.imageLength} image={d} />;
                }.bind(this))}
              </div>);
    }
  });

  // A single Image
  var TaggedImage = React.createClass({
    render: function() {
      var divStyle = {
	width: this.props.imageLength,
	height: this.props.imageLength};
      var imgStyle = {'margin-top': "-20%",
		      'margin-left': "-20%"};
      if (this.props.image.width > this.props.image.height) {
	imgStyle.width = "140%";
      } else {
	imgStyle.height = "140%";
      }

      return (<div className={this.props.className} style={divStyle}>
                  <img src={this.props.image.url} style={imgStyle} />
              </div>);
    }
  });

  // The Image detail view
  var ImageDetail = React.createClass({
    render: function() {
      return (<div className="image-detail">
                <img src={this.props.image.url} />
                <p>More goes here</p>
              </div>);
    }
  });

  React.renderComponent(<NavBar />, $("header").get(0));
  React.renderComponent(<Gallery tag="everydayafrica" />, $("#content").get(0));

});
