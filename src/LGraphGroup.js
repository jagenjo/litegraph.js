(function(global) {

	class LGraphGroup {
		constructor(title) {
			this._ctor(title);
		}

		_ctor(title) {
			this.title = title || "Group";
			this.font_size = 24;
			this.color = LGraphCanvas.node_colors.pale_blue ?
				LGraphCanvas.node_colors.pale_blue.groupcolor :
				"#AAA";
			this._bounding = new Float32Array([10, 10, 140, 80]);
			this._pos = this._bounding.subarray(0, 2);
			this._size = this._bounding.subarray(2, 4);
			this._nodes = [];
			this.graph = null;

			Object.defineProperty(this, "pos", {
				set: function(v) {
					if (!v || v.length < 2) {
						return;
					}
					this._pos[0] = v[0];
					this._pos[1] = v[1];
				},
				get: function() {
					return this._pos;
				},
				enumerable: true
			});

			Object.defineProperty(this, "size", {
				set: function(v) {
					if (!v || v.length < 2) {
						return;
					}
					this._size[0] = Math.max(140, v[0]);
					this._size[1] = Math.max(80, v[1]);
				},
				get: function() {
					return this._size;
				},
				enumerable: true
			});
		}

		configure(o) {
			this.title = o.title;
			this._bounding.set(o.bounding);
			this.color = o.color;
			this.font_size = o.font_size;
		};

		serialize() {
			var b = this._bounding;
			return {
				title: this.title,
				bounding: [
					Math.round(b[0]),
					Math.round(b[1]),
					Math.round(b[2]),
					Math.round(b[3])
				],
				color: this.color,
				font_size: this.font_size
			};
		}

		move(deltax, deltay, ignore_nodes) {
			this._pos[0] += deltax;
			this._pos[1] += deltay;
			if (ignore_nodes) {
				return;
			}
			for (var i = 0; i < this._nodes.length; ++i) {
				var node = this._nodes[i];
				node.pos[0] += deltax;
				node.pos[1] += deltay;
			}
		}

		recomputeInsideNodes() {
			this._nodes.length = 0;
			var nodes = this.graph._nodes;
			var node_bounding = new Float32Array(4);

			for (var i = 0; i < nodes.length; ++i) {
				var node = nodes[i];
				node.getBounding(node_bounding);
				if (!LiteGraph.overlapBounding(this._bounding, node_bounding)) {
					continue;
				} //out of the visible area
				this._nodes.push(node);
			}
		}
	}

	global.LGraphGroup = LiteGraph.LGraphGroup = LGraphGroup;
	LGraphGroup.prototype.isPointInside = LGraphNode.prototype.isPointInside;
	LGraphGroup.prototype.setDirtyCanvas = LGraphNode.prototype.setDirtyCanvas;

})(this);
