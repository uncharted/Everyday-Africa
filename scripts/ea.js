/** @jsx React.DOM */
"use strict";

(function($, React) {
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


  var NavBar = React.createClass({
    render: function() {
      return (
          <div>
            <nav>
              <ul className="nav-buttons">
                <li><NavButton src="Countries" /></li>
                <li><NavButton src="Photographers" /></li>
              </ul>
              <h1><a href="/"><span className="everyday">Everyday</span>Africa</a></h1>
            </nav>
            <Gallery tag="everydayafrica" />
          </div>
      );

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
      console.log("WTFuckles");
    }
  });

  // The gallery of instagram images
  var Gallery = React.createClass({
    getInitialState: function() {
      return {data: []};
    },

    componentWillMount: function() {
      instaFetch.fetchByTag(this.props.tag)
        .done(function(d) {
            this.setState({data: d.data});
          }.bind(this))
        .fail(function(d) {
            alert("Failed to fetch tagged photos")
          });
    },

    render: function() {
      return (<div id="gallery">
                {this.state.data.map(function(d) {
                  var image = d.images.low_resolution,
                      isPortrait = image.height > image.width;

                  var classes = React.addons.classSet({
                    'tagged-image': true,
                    image: true,
                    portrait: isPortrait,
                    landscape: !isPortrait});

                  return <Image key={d.id} className={classes} image={image} data={d} />;
                })}
              </div>);
    }
  });

  var Image = React.createClass({
    render: function() {
      return (<div className={this.props.className}>
                <a href={this.props.data.link}>
                  <img src={this.props.image.url} />
                </a>
              </div>);
    }
  });

  var ImageDetail = React.createClass({
    render: function() {
      return (<div className="image-detail">
                <img src={this.props.image.url} />
                <p>More goes here</p>
              </div>);
    }
  });

  React.renderComponent(<NavBar />, document.getElementById("content"));

})(jQuery, React);
