'use strict';

const R1 = 0.5;
const R2 = 1.5;
const B = 1.0;

function Vertex(p) {
    this.p = p;
    this.normal = [0, 0, 0];
    this.triangles = [];
}

function Triangle(v0, v1, v2) {
    this.v0 = v0;
    this.v1 = v1;
    this.v2 = v2;
    this.normal = [0, 0, 0];
}

function calc_radius(alpha) {
    const k = Math.PI / (2 * B);
    return (R2 - R1) / 2 * (1 - Math.cos(k * alpha)) + R1;
}

function surface_point(alpha, beta) {
    const r = calc_radius(alpha);
    return [
        r * Math.cos(beta),
        r * Math.sin(beta),
        alpha - B
    ];
}

function vec_sub(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function vec_cross(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ];
}

function vec_add(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function vec_normalize(v) {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    if (len < 1e-10) return [0, 0, 1];
    return [v[0] / len, v[1] / len, v[2] / len];
}

function calc_triangle_normal(vertices, tri) {
    const p0 = vertices[tri.v0].p;
    const p1 = vertices[tri.v1].p;
    const p2 = vertices[tri.v2].p;
    const e1 = vec_sub(p1, p0);
    const e2 = vec_sub(p2, p0);
    return vec_normalize(vec_cross(e1, e2));
}

function create_surface_data(n_alpha, n_beta) {
    const vertices = [];
    const triangles = [];

    const d_alpha = (2 * B) / n_alpha;
    const d_beta = (2 * Math.PI) / n_beta;

    for (let i = 0; i <= n_alpha; i++) {
        const alpha = i * d_alpha;
        for (let j = 0; j < n_beta; j++) {
            const beta = j * d_beta;
            vertices.push(new Vertex(surface_point(alpha, beta)));
        }
    }

    const cols = n_beta;

    for (let i = 0; i < n_alpha; i++) {
        for (let j = 0; j < n_beta; j++) {
            const j_next = (j + 1) % n_beta;

            const v00 = i * cols + j;
            const v10 = (i + 1) * cols + j;
            const v01 = i * cols + j_next;
            const v11 = (i + 1) * cols + j_next;

            const t1 = new Triangle(v00, v10, v11);
            const t1_idx = triangles.length;
            triangles.push(t1);
            vertices[v00].triangles.push(t1_idx);
            vertices[v10].triangles.push(t1_idx);
            vertices[v11].triangles.push(t1_idx);

            const t2 = new Triangle(v00, v11, v01);
            const t2_idx = triangles.length;
            triangles.push(t2);
            vertices[v00].triangles.push(t2_idx);
            vertices[v11].triangles.push(t2_idx);
            vertices[v01].triangles.push(t2_idx);
        }
    }

    for (const tri of triangles) {
        tri.normal = calc_triangle_normal(vertices, tri);
    }

    for (const vert of vertices) {
        let n = [0, 0, 0];
        for (const t_idx of vert.triangles) {
            n = vec_add(n, triangles[t_idx].normal);
        }
        vert.normal = vec_normalize(n);
    }

    const vert_data = new Float32Array(vertices.length * 6);
    for (let i = 0; i < vertices.length; i++) {
        vert_data[i * 6 + 0] = vertices[i].p[0];
        vert_data[i * 6 + 1] = vertices[i].p[1];
        vert_data[i * 6 + 2] = vertices[i].p[2];
        vert_data[i * 6 + 3] = vertices[i].normal[0];
        vert_data[i * 6 + 4] = vertices[i].normal[1];
        vert_data[i * 6 + 5] = vertices[i].normal[2];
    }

    const idx_data = new Uint16Array(triangles.length * 3);
    for (let i = 0; i < triangles.length; i++) {
        idx_data[i * 3 + 0] = triangles[i].v0;
        idx_data[i * 3 + 1] = triangles[i].v1;
        idx_data[i * 3 + 2] = triangles[i].v2;
    }

    return { vertices: vert_data, indices: idx_data };
}

function Model(name) {
    this.name = name;
    this.vertex_buffer = gl.createBuffer();
    this.index_buffer = gl.createBuffer();
    this.count = 0;

    this.buffer_data = function(vertices, indices) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.index_buffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        this.count = indices.length;
    };

    this.draw = function() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);

        gl.vertexAttribPointer(sh_program.i_attrib_vertex, 3, gl.FLOAT, false, 24, 0);
        gl.enableVertexAttribArray(sh_program.i_attrib_vertex);

        gl.vertexAttribPointer(sh_program.i_attrib_normal, 3, gl.FLOAT, false, 24, 12);
        gl.enableVertexAttribArray(sh_program.i_attrib_normal);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.index_buffer);
        gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
    };
}
