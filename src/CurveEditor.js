(function(global) {

	//used by some widgets to render a curve editor
	class CurveEditor {
		constructor(points) {
			this.points = points;
			this.selected = -1;
			this.nearest = -1;
			this.size = null; //stores last size used
			this.must_update = true;
			this.margin = 5;
		}

		static sampleCurve(f, points) {
			if (!points)
				return;
			for (var i = 0; i < points.length - 1; ++i) {
				var p = points[i];
				var pn = points[i + 1];
				if (pn[0] < f)
					continue;
				var r = (pn[0] - p[0]);
				if (Math.abs(r) < 0.00001)
					return p[1];
				var local_f = (f - p[0]) / r;
				return p[1] * (1.0 - local_f) + pn[1] * local_f;
			}
			return 0;
		}

		draw(ctx, size, graphcanvas, background_color, line_color, inactive) {
			var points = this.points;
			if (!points)
				return;
			this.size = size;
			var w = size[0] - this.margin * 2;
			var h = size[1] - this.margin * 2;

			line_color = line_color || "#666";

			ctx.save();
			ctx.translate(this.margin, this.margin);

			if (background_color) {
				ctx.fillStyle = "#111";
				ctx.fillRect(0, 0, w, h);
				ctx.fillStyle = "#222";
				ctx.fillRect(w * 0.5, 0, 1, h);
				ctx.strokeStyle = "#333";
				ctx.strokeRect(0, 0, w, h);
			}
			ctx.strokeStyle = line_color;
			if (inactive)
				ctx.globalAlpha = 0.5;
			ctx.beginPath();
			for (var i = 0; i < points.length; ++i) {
				var p = points[i];
				ctx.lineTo(p[0] * w, (1.0 - p[1]) * h);
			}
			ctx.stroke();
			ctx.globalAlpha = 1;
			if (!inactive)
				for (var i = 0; i < points.length; ++i) {
					var p = points[i];
					ctx.fillStyle = this.selected == i ? "#FFF" : (this.nearest == i ? "#DDD" :
						"#AAA");
					ctx.beginPath();
					ctx.arc(p[0] * w, (1.0 - p[1]) * h, 2, 0, Math.PI * 2);
					ctx.fill();
				}
			ctx.restore();
		}

		//localpos is mouse in curve editor space
		onMouseDown(localpos, graphcanvas) {
			var points = this.points;
			if (!points)
				return;
			if (localpos[1] < 0)
				return;

			//this.captureInput(true);
			var w = this.size[0] - this.margin * 2;
			var h = this.size[1] - this.margin * 2;
			var x = localpos[0] - this.margin;
			var y = localpos[1] - this.margin;
			var pos = [x, y];
			var max_dist = 30 / graphcanvas.ds.scale;
			//search closer one
			this.selected = this.getCloserPoint(pos, max_dist);
			//create one
			if (this.selected == -1) {
				var point = [x / w, 1 - y / h];
				points.push(point);
				points.sort(function(a, b) {
					return a[0] - b[0];
				});
				this.selected = points.indexOf(point);
				this.must_update = true;
			}
			if (this.selected != -1)
				return true;
		}

		onMouseMove(localpos, graphcanvas) {
			var points = this.points;
			if (!points)
				return;
			var s = this.selected;
			if (s < 0)
				return;
			var x = (localpos[0] - this.margin) / (this.size[0] - this.margin * 2);
			var y = (localpos[1] - this.margin) / (this.size[1] - this.margin * 2);
			var curvepos = [(localpos[0] - this.margin), (localpos[1] - this.margin)];
			var max_dist = 30 / graphcanvas.ds.scale;
			this._nearest = this.getCloserPoint(curvepos, max_dist);
			var point = points[s];
			if (point) {
				var is_edge_point = s == 0 || s == points.length - 1;
				if (!is_edge_point && (localpos[0] < -10 || localpos[0] > this.size[0] + 10 ||
						localpos[1] < -10 || localpos[1] > this.size[1] + 10)) {
					points.splice(s, 1);
					this.selected = -1;
					return;
				}
				if (!is_edge_point) //not edges
					point[0] = clamp(x, 0, 1);
				else
					point[0] = s == 0 ? 0 : 1;
				point[1] = 1.0 - clamp(y, 0, 1);
				points.sort(function(a, b) {
					return a[0] - b[0];
				});
				this.selected = points.indexOf(point);
				this.must_update = true;
			}
		}

		onMouseUp(localpos, graphcanvas) {
			this.selected = -1;
			return false;
		}

		getCloserPoint(pos, max_dist) {
			var points = this.points;
			if (!points)
				return -1;
			max_dist = max_dist || 30;
			var w = (this.size[0] - this.margin * 2);
			var h = (this.size[1] - this.margin * 2);
			var num = points.length;
			var p2 = [0, 0];
			var min_dist = 1000000;
			var closest = -1;
			var last_valid = -1;
			for (var i = 0; i < num; ++i) {
				var p = points[i];
				p2[0] = p[0] * w;
				p2[1] = (1.0 - p[1]) * h;
				if (p2[0] < pos[0])
					last_valid = i;
				var dist = vec2.distance(pos, p2);
				if (dist > min_dist || dist > max_dist)
					continue;
				closest = i;
				min_dist = dist;
			}
			return closest;
		}
	}

	LiteGraph.CurveEditor = CurveEditor;

})(this);
