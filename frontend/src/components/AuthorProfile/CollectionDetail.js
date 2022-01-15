import React, { Component } from 'react';
import axios from 'axios';
import eventBus from "../../EventBus";

const BASE_URL = "https://my-json-server.typicode.com/themeland/netstorm-json-1/author";

class CollectionDetail extends Component {
    constructor(props) {
        super(props)
        this.state = {
            data: {
                img: null,
                authorImg: null,
            }
        }
    }
    componentDidUpdate(nextProps) {
        console.log(nextProps)
    }
    render() {
        return (
            <div className="card no-hover text-center ap_body ap_anim">
                <div className="image-over">
                    <img className="card-img-top" src={this.props.tokenURI} alt="" />
                    {/* Author */}
                    <div className="author">
                        <div className="author-thumb avatar-lg">
                            <img className="rounded-circle" src={this.state.data.authorImg} alt="" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default CollectionDetail;