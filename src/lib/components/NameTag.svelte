<script lang="ts">
	interface Props {
		name: string;
	}

	let { name }: Props = $props();

	const NameColours = {
		Jim: 'lightblue',
		Jasmin: 'lightgreen'
	};

	let color = $derived(NameColours[name as keyof typeof NameColours] || 'lightgray');
</script>

<span style:background-color={color}>{name}</span>

<style>
	span {
		padding: 2px 4px;
		border-radius: 4px;
		font-size: 10px;
	}
</style>
