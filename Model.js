'use strict';

const R1 = 0.5;
const R2 = 1.5;
const B = 1.0;

function Vertex(p, uv) {
    this.p = p;
    this.uv = uv;
    this.normal = [0, 0, 0];
    this.tangent = [0, 0, 0];
    this.triangles = [];
}

function Triangle(v0, v1, v2) {
    this.v0 = v0;
    this.v1 = v1;
    this.v2 = v2;
    this.normal = [0, 0, 0];
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

function vec_scale(v, s) {
    return [v[0] * s, v[1] * s, v[2] * s];
}

function vec_normalize(v) {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    if (len < 1e-10) return [0, 0, 1];
    return [v[0] / len, v[1] / len, v[2] / len];
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

function calc_analytical_tangent(alpha, beta) {
    // tangent along beta direction (U): dr/dbeta
    // standard convention: tangent follows texture U coordinate
    const r = calc_radius(alpha);

    const tx = -r * Math.sin(beta);
    const ty = r * Math.cos(beta);
    const tz = 0.0;

    return vec_normalize([tx, ty, tz]);
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

    // generate vertices with positions, uvs, and tangents
    for (let i = 0; i <= n_alpha; i++) {
        const alpha = i * d_alpha;
        const v_coord = alpha / (2 * B); // v in [0, 1]

        for (let j = 0; j < n_beta; j++) {
            const beta = j * d_beta;
            const u_coord = beta / (2 * Math.PI); // u in [0, 1)

            const vert = new Vertex(surface_point(alpha, beta), [u_coord, v_coord]);
            vert.tangent = calc_analytical_tangent(alpha, beta);
            vertices.push(vert);
        }
    }

    const cols = n_beta;

    // generate triangles
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

    // calc triangle normals
    for (const tri of triangles) {
        tri.normal = calc_triangle_normal(vertices, tri);
    }

    // facet average: sum triangle normals for each vertex
    for (const vert of vertices) {
        let n = [0, 0, 0];
        for (const t_idx of vert.triangles) {
            n = vec_add(n, triangles[t_idx].normal);
        }
        vert.normal = vec_normalize(n);
    }

    // pack vertex data: position (3) + normal (3) + tangent (3) + uv (2) = 11 floats
    const vert_data = new Float32Array(vertices.length * 11);
    for (let i = 0; i < vertices.length; i++) {
        const base = i * 11;
        // position
        vert_data[base + 0] = vertices[i].p[0];
        vert_data[base + 1] = vertices[i].p[1];
        vert_data[base + 2] = vertices[i].p[2];
        // normal
        vert_data[base + 3] = vertices[i].normal[0];
        vert_data[base + 4] = vertices[i].normal[1];
        vert_data[base + 5] = vertices[i].normal[2];
        // tangent
        vert_data[base + 6] = vertices[i].tangent[0];
        vert_data[base + 7] = vertices[i].tangent[1];
        vert_data[base + 8] = vertices[i].tangent[2];
        // uv
        vert_data[base + 9] = vertices[i].uv[0];
        vert_data[base + 10] = vertices[i].uv[1];
    }

    // pack indices
    const idx_data = new Uint16Array(triangles.length * 3);
    for (let i = 0; i < triangles.length; i++) {
        idx_data[i * 3 + 0] = triangles[i].v0;
        idx_data[i * 3 + 1] = triangles[i].v1;
        idx_data[i * 3 + 2] = triangles[i].v2;
    }

    return { vertices: vert_data, indices: idx_data };
}

// Model constructor
function Model(name) {
    this.name = name;
    this.vertex_buffer = gl.createBuffer();
    this.index_buffer = gl.createBuffer();
    this.count = 0;

    // texture ids
    this.tex_diffuse = null;
    this.tex_specular = null;
    this.tex_normal = null;

    this.buffer_data = function(vertices, indices) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.index_buffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        this.count = indices.length;
    };

    this.draw = function() {
        // bind textures
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.tex_diffuse);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.tex_specular);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.tex_normal);

        // setup vertex attribs - interleaved, stride = 11 * 4 = 44 bytes
        const stride = 44;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);

        // position at offset 0
        gl.vertexAttribPointer(sh_program.i_attrib_vertex, 3, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(sh_program.i_attrib_vertex);

        // normal at offset 12 (3 floats * 4 bytes)
        gl.vertexAttribPointer(sh_program.i_attrib_normal, 3, gl.FLOAT, false, stride, 12);
        gl.enableVertexAttribArray(sh_program.i_attrib_normal);

        // tangent at offset 24 (6 floats * 4 bytes)
        gl.vertexAttribPointer(sh_program.i_attrib_tangent, 3, gl.FLOAT, false, stride, 24);
        gl.enableVertexAttribArray(sh_program.i_attrib_tangent);

        // texcoord at offset 36 (9 floats * 4 bytes)
        gl.vertexAttribPointer(sh_program.i_attrib_texcoord, 2, gl.FLOAT, false, stride, 36);
        gl.enableVertexAttribArray(sh_program.i_attrib_texcoord);

        // draw
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.index_buffer);
        gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
    };
}
