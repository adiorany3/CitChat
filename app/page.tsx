const SRC = 'https://ngobrol.streamlit.app/?embed=true&template=true';

export default function Home() {
	return <main>
		<header>
			<img src="/logo.svg" alt="CitChat" width="183" height="48" />
		</header>
		<section className="chat-frame" aria-label="Ruang ngobrol CitChat">
			<iframe src={SRC} title="Ngobrol di CitChat" loading="eager" allow="fullscreen" />
		</section>
	</main>;
}
