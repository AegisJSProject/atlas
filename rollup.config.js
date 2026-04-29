import terser from '@rollup/plugin-terser';

export default [{
	input: 'atlas.js',
	output: [{
		file: 'atlas.cjs',
		format: 'cjs',
	}, {
		file: 'atlas.min.js',
		format: 'module',
		plugins: [terser()],
		sourcemap: true,
	}],
}];
