const SRC = 'https://ngobrol.streamlit.app/?embed=true&template=true';

export default function Home() {
	return <main>
		<header><img src="/logo.svg" alt="CitChat" width="183" height="48" /></header>
		<iframe src={SRC} title="Ngobrol di CitChat" />
	</main>;
}
