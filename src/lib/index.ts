import Tesseract, { createWorker } from 'tesseract.js';
import Store, { readable, derived, writable } from 'svelte/store';

/// create js-worker to run tesseract, also make him update the _progress state
const worker = createWorker({
	logger: (m) => {
		_progress.update((p) => <Progress>{ status: m.status, progress: m.progress });
	}
});

/// set this writeable to the image that shall be scanned
export const image: Store.Writable<Tesseract.ImageLike> = writable();


interface Progress {
	/// what step of the recognition are we currently in
	status: string;
	/// how far has this step progressed
	progress: number;
}

/// initializes the worker if not already initialized
export const initialize = async ()=>{
	if(_is_initialized)return;
	await worker.load();
	await worker.loadLanguage('eng');
	await worker.initialize('eng');
	_is_initialized = true;
}

/// cleans up all recognition stuff if its no longer needed
export const terminate = async ()=>{
	_is_initialized=false;
	await worker.terminate();
}

/// stores whether the worker is ready for recognition
let _is_initialized = false;

/// combines status and progress into one store
const _progress: Store.Writable<Progress> = writable();


/// what step of the recognition are we currently in
export const status = derived(_progress, ($_progress) => $_progress.status);

/// how far has this step progressed
export const progress = derived(_progress, ($_progress) => $_progress.progress);


const _recognize = async (image: Tesseract.ImageLike): Promise<Tesseract.RecognizeResult> => {
	//make sure worker is ready
	await initialize();
	const result = await worker.recognize(image);
	console.log({text_found: result.data.text});
	return result;
};

/// the fully writeable result store, but we dont want to expose the setters..
const _result: Store.Writable<Tesseract.RecognizeResult> = writable();

/// readable result directly from tesseract with all its data
export const result: Store.Readable<Tesseract.RecognizeResult> = { subscribe: _result.subscribe };

/// all the resulting text
export const allText = derived(result, ($result) => $result.data.text);




/// listens to image changes to run recognition pipeline
image.subscribe(newImg=>_recognize(newImg).then((res) => _result.set(res)));
