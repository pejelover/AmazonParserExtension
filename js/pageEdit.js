import Persistence from './Persistence.js';
import Utils from './Diabetes/Util.js';
import PromiseUtils from './Promise-Utils/PromiseUtils.js';

document.addEventListener('DOMContentLoaded', function()
{
	let persistence = new Persistence();

	persistence.init().then(()=>
	{

	})
	.catch((error)=>
	{
		console.log( error );
	});

	Utils.getById('pageEditButton').addEventListener('click',(evt)=>
	{
		Utils.stopEvent( evt );
		let rows =  Utils.getById('pageEditTextarea').value.trim().split('\n');

		if( rows.length == 0 )
			return;

		let gen = (line)=>
		{
			let tokens = line.replace(/\s\+/g,' ').split(/\s/);

			if( tokens.length < 2 )
				return Promise.resolve(line+' Fail ');

			let values= getTokenValues( tokens );

			if( values.action === '-' )
			{
				return persistence.deleteStock( values.asin ,values.seller_id, values.date, values.qty, values.is_prime )
					.then((count)=>
					{
						return Promise.resolve(line+' '+count );
					});
			}
			else if( values.action === '+' )
			{
				return persistence.addStockItem( values.asin, values.seller_id, values.date, values.qty, values.is_prime )
					.then(()=>
					{
						return Promise.resolve( line+' OK' );
					});
			}
			else if( values.action === '*' )
			{
				return persitence.editStock( values.asin, values.seller_id, values.date, values.qty, values.is_prime )
					.then((count)=>
					{
						return Promise.resolve(line +' '+count );
					});
			}

			return Promise.resolve(line+' FAILS WRONG OPTION -+*');
		};

		PromiseUtils.runSequential( rows, gen ).then((results)=>
		{
			Utils.getById('pageEditTextarea').value = results.join('\n');
		});
	});
});

function getTokenValues(tokens)
{
	let action = tokens[ 0 ];
	let asin = tokens[ 1 ];
	let seller_id = tokens[2];
	let is_prime  = tokens[3] === "1" || tokens[3].toLowerCase() === "true";

	let date = null;
	let qty = null;

	if( tokens.length  > 3 )
		date = tokens[4];

	if( tokens.length > 5 )
		qty = tokens[5];

	return {
		action		: action
		,asin		: asin
		,seller_id	: seller_id
		,date		: date
		,qty		: qty
		,is_prime 	: is_prime
	};
}
