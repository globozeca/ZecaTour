-- ZecaTour: initial ALFA Beach Bar food menu import.
-- Source: menu text supplied by the tenant. Prices are imported only where explicitly present.
-- Alcoholic beverage sections are intentionally not included in this import.
-- Missing-price items and the unlabelled "Produto 4" entry are excluded for later confirmation.
-- Safe to re-run: existing categories/products with the same Portuguese name are not duplicated.

begin;

do $$
declare
  v_tenant_id uuid;
  v_category_id uuid;
  v_category jsonb;
  v_product jsonb;
  v_order integer := 0;
  v_product_order integer := 0;
  v_categories jsonb := '[
    {"name":"Entradas"},
    {"name":"Snacks"},
    {"name":"Brunch"},
    {"name":"Ovos"},
    {"name":"Carne"},
    {"name":"Carne de Porco"},
    {"name":"Frango"},
    {"name":"Peixe & Mariscos"},
    {"name":"Espetadas"},
    {"name":"Vegetariano"},
    {"name":"Crepes Salgados"},
    {"name":"Pizzas"},
    {"name":"Hambúrgueres"},
    {"name":"Saladas"},
    {"name":"Sobremesas e Gelados"}
  ]'::jsonb;
  v_products jsonb := '[
    {"category":"Entradas","name":"Tábua de Enchidos","description":"","price":11150},
    {"category":"Entradas","name":"Camarão “frito ao Alho”","description":"200gr","price":14400},
    {"category":"Entradas","name":"Camarão ao Natural","description":"200gr","price":14100},
    {"category":"Entradas","name":"Chouriço Assado","description":"","price":7900},
    {"category":"Entradas","name":"Choco Frito","description":"","price":4650},
    {"category":"Entradas","name":"Frango à Passarinho","description":"450gr","price":4650},
    {"category":"Entradas","name":"Pica Pau","description":"250gr","price":4500},
    {"category":"Entradas","name":"Dobrada","description":"250gr","price":3250},
    {"category":"Entradas","name":"Moelas","description":"250gr","price":3450},
    {"category":"Entradas","name":"Pão de Alho e Orégãos","description":"1 und","price":1400},
    {"category":"Entradas","name":"Pão de Alho e Queijo","description":"1 und","price":1650},
    {"category":"Entradas","name":"Azeitonas ao Alho","description":"","price":2000},
    {"category":"Entradas","name":"Paté do Dia","description":"10gr","price":1650},
    {"category":"Entradas","name":"Manteiga","description":"10gr","price":600},
    {"category":"Entradas","name":"Pão","description":"1 und","price":150},
    {"category":"Entradas","name":"Bruschetta Italiana","description":"","price":1650},
    {"category":"Entradas","name":"Rissol","description":"1 und","price":950},
    {"category":"Entradas","name":"Croquete","description":"1 und","price":700},
    {"category":"Entradas","name":"Coxinha","description":"1 und","price":700},

    {"category":"Snacks","name":"Sandes Club","description":"Chourição, bacon, frango desfiado, queijo, ovo, alface, tomate, mayonnaise e batata frita.","price":9500},
    {"category":"Snacks","name":"Sandes de Queijo e Fiambre","description":"","price":1700},
    {"category":"Snacks","name":"Sandes de Queijo ou Fiambre","description":"","price":1300},
    {"category":"Snacks","name":"Sandes de Chourição e Queijo","description":"","price":2500},
    {"category":"Snacks","name":"Sandes de Atum","description":"Atum, cebola, tomate, alface e maionese.","price":3550},
    {"category":"Snacks","name":"Prego no Pão","description":"","price":3550},
    {"category":"Snacks","name":"Prego no Prato com Ovo","description":"","price":4900},
    {"category":"Snacks","name":"Tosta Queijo e Fiambre","description":"","price":1800},
    {"category":"Snacks","name":"Tosta Queijo ou Fiambre","description":"","price":1300},
    {"category":"Snacks","name":"Tosta Queijo e Chourição","description":"","price":2350},
    {"category":"Snacks","name":"Tosta Queijo e Bacon","description":"","price":2650},
    {"category":"Snacks","name":"Tosta de Ovo com Queijo e Fiambre","description":"","price":2000},
    {"category":"Snacks","name":"Tosta Mista com Tomate e Cebola","description":"","price":2200},

    {"category":"Brunch","name":"Brunch Alfa","description":"Servido entre 9h e 11h. Ovo mexido, 2 salsichas, 2 bacon, 2 queijos, 2 fiambres, fruta da época, tomate grelhado, pão e manteiga.","price":9600},

    {"category":"Ovos","name":"Omolete simples","description":"","price":3000},
    {"category":"Ovos","name":"Omelete de Camarão","description":"","price":5000},
    {"category":"Ovos","name":"Omelete de Atum e Cebola","description":"","price":4400},
    {"category":"Ovos","name":"Omelete de Queijo e Fiambre","description":"","price":4750},
    {"category":"Ovos","name":"Omelete de Legumes","description":"","price":3450},
    {"category":"Ovos","name":"Ovos Estrelados com Bacon","description":"2 ovos estrelados, 2 bacon e batata frita.","price":4600},
    {"category":"Ovos","name":"Ovos Estrelados com Salsicha","description":"2 ovos estrelados, salsicha e batata frita.","price":4200},

    {"category":"Carne","name":"Picanha Laminada","description":"Com banana pão, arroz, feijão preto, batata frita e salada.","price":19500},
    {"category":"Carne","name":"Bife à Cavalo","description":"Com batata frita, arroz e salada.","price":9350},
    {"category":"Carne","name":"Bife do Lombo “3 Pimentas”","description":"Com batata chips e legumes salteados.","price":18900},
    {"category":"Carne","name":"Bife do Lombo “Terra e Mar”","description":"Com batata chips e legumes salteados.","price":18900},
    {"category":"Carne","name":"Costeleta de Vaca Grelhada","description":"Com molho de alho e malagueta, batata frita e salada.","price":14900},
    {"category":"Carne","name":"Grelhada Mista de Carne","description":"1 entremeada, 1 entrecosto, 1 tira de vaca, 1 tira de porco, frango e linguiça; acompanha feijão preto, batata frita, banana ou ananás, arroz e salada.","price":22500},

    {"category":"Carne de Porco","name":"Tiras de Carne de Porco","description":"Com molho de tomate, couves refogadas e pirão.","price":9500},
    {"category":"Carne de Porco","name":"Entrecosto Grelhado","description":"Com ananás, batata doce frita e salada.","price":11150},
    {"category":"Carne de Porco","name":"Bitoque de Porco","description":"Com batata frita, arroz e salada.","price":9350},

    {"category":"Frango","name":"Peito de Frango Grelhado","description":"Com molho de manteiga e alho, batata frita, arroz e salada.","price":11000},
    {"category":"Frango","name":"Frango Panado (1/2)","description":"Com batata chips e salada.","price":10600},
    {"category":"Frango","name":"Frango Grelhado (1/2)","description":"Com batata frita, arroz e salada.","price":10600},

    {"category":"Peixe & Mariscos","name":"Bacalhau à Lagareiro","description":"Servido regado com azeite quente, onde deverão ter sido alourados alhos e pequenos pedaços de cebola.","price":23500},
    {"category":"Peixe & Mariscos","name":"Posta de Garoupa Grelhada","description":"Com batata doce assada e legumes salteados.","price":16500},
    {"category":"Peixe & Mariscos","name":"Posta de Corvina Grelhada","description":"Com batata doce cozida e legumes salteados.","price":14700},
    {"category":"Peixe & Mariscos","name":"Choco Grelhado","description":"Com batata cozida e legumes salteados.","price":12150},
    {"category":"Peixe & Mariscos","name":"Polvo à Lagareiro","description":"Servido regado com azeite quente, onde deverão ter sido alourados alhos e pequenos pedaços de cebola.","price":11050},

    {"category":"Espetadas","name":"Espetada de Polvo e Camarão","description":"Com batata frita e legumes salteados.","price":13150},
    {"category":"Espetadas","name":"Espetada “Trilogia do Mar”","description":"Com batata doce frita e legumes salteados.","price":15600},

    {"category":"Vegetariano","name":"Caril de Grão e Batata","description":"","price":6500},

    {"category":"Crepes Salgados","name":"Crepe Alfa (camarão)","description":"Com batata frita e salada.","price":11000},
    {"category":"Crepes Salgados","name":"Crepe de Atum e Milho","description":"Com batata frita e salada.","price":8550},
    {"category":"Crepes Salgados","name":"Crepe de Queijo e Fiambre","description":"Com batata frita e salada.","price":8550},

    {"category":"Pizzas","name":"Pizza Alfa","description":"Molho de tomate, queijo, camarão, cebola às rodelas e azeitonas.","price":15200},
    {"category":"Pizzas","name":"Pizza Mexicana","description":"Molho de tomate, queijo, carne moída, pimento verde e azeitonas.","price":9750},
    {"category":"Pizzas","name":"Pizza Havaiana","description":"Molho de tomate, queijo, fiambre e ananás.","price":10600},
    {"category":"Pizzas","name":"Pizza Tuna","description":"Molho de tomate, queijo, atum, cebola e azeitonas.","price":10100},
    {"category":"Pizzas","name":"Pizza Berinjela e Tomate","description":"Molho de tomate, queijo, berinjela salteada, orégão e manjericão.","price":7150},
    {"category":"Pizzas","name":"Pizza Porky","description":"Molho de tomate, queijo, bacon, chourição, fiambre, cogumelos, ananás e azeitonas.","price":10900},
    {"category":"Pizzas","name":"Pizza Margarita","description":"Molho de tomate, queijo, tomate às rodelas, orégão e manjericão fresco.","price":7850},
    {"category":"Pizzas","name":"Pizza Portuguesa","description":"Molho de tomate, queijo, chourição, pimento verde e azeitonas.","price":11400},
    {"category":"Pizzas","name":"Pizza Vegetariana","description":"Molho de tomate, queijo, milho, cebola, tomate, cogumelos, cenoura, pimentos, orégão e manjericão.","price":9400},
    {"category":"Pizzas","name":"Pizza 4 estações","description":"Molho de tomate, queijo, tomate, pimento verde, milho, cebola, azeitonas e 4 ingredientes disponíveis.","price":10700},

    {"category":"Hambúrgueres","name":"Alfa Maxi Burguer","description":"Duplo hambúrguer com queijo, fiambre, ovo, cebola, tomate e alface.","price":9750},
    {"category":"Hambúrgueres","name":"Blondie Burguer","description":"Hambúrguer com ovo, queijo, fiambre, tomate e alface.","price":7450},
    {"category":"Hambúrgueres","name":"Chilli Burguer","description":"Hambúrguer com molho de tomate picante.","price":4500},

    {"category":"Saladas","name":"Salada Grega","description":"Com tomate, pepino, alface e queijo grego. Com azeite, salsa e manjericão.","price":2650},
    {"category":"Saladas","name":"Salada de Frango","description":"","price":6400},
    {"category":"Saladas","name":"Saladinha de Polvo","description":"","price":2650},
    {"category":"Saladas","name":"Salada de Atum com Feijão Frade","description":"","price":6400},

    {"category":"Sobremesas e Gelados","name":"Bolo de Chocolate","description":"Especial da casa.","price":3000},
    {"category":"Sobremesas e Gelados","name":"Pudim","description":"","price":2500},
    {"category":"Sobremesas e Gelados","name":"Mousse de Chocolate","description":"","price":4200},
    {"category":"Sobremesas e Gelados","name":"Crepe com Leite Condensado e Canela","description":"","price":2500},
    {"category":"Sobremesas e Gelados","name":"Crepe com Açúcar e Canela","description":"","price":1900},
    {"category":"Sobremesas e Gelados","name":"Crepe com Açúcar e Limão","description":"","price":1900}
  ]'::jsonb;
begin
  select id into v_tenant_id
  from public.tenants
  where slug = 'alfa'
  limit 1;

  if v_tenant_id is null then
    raise exception 'Tenant ALFA (slug alfa) não encontrado.';
  end if;

  for v_category in select value from jsonb_array_elements(v_categories)
  loop
    v_order := v_order + 1;
    if not exists (
      select 1
      from public.menu_categories c
      where c.tenant_id = v_tenant_id
        and c.name ->> 'pt' = v_category ->> 'name'
    ) then
      insert into public.menu_categories (tenant_id, name, sort_order, is_active)
      values (
        v_tenant_id,
        jsonb_build_object('pt', v_category ->> 'name'),
        v_order,
        true
      );
    end if;
  end loop;

  for v_product in select value from jsonb_array_elements(v_products)
  loop
    select c.id into v_category_id
    from public.menu_categories c
    where c.tenant_id = v_tenant_id
      and c.name ->> 'pt' = v_product ->> 'category'
    order by c.sort_order
    limit 1;

    if v_category_id is null then
      raise exception 'Categoria não encontrada: %', v_product ->> 'category';
    end if;

    v_product_order := v_product_order + 1;

    if not exists (
      select 1
      from public.menu_products p
      where p.tenant_id = v_tenant_id
        and p.category_id = v_category_id
        and p.name ->> 'pt' = v_product ->> 'name'
    ) then
      insert into public.menu_products (
        tenant_id, category_id, name, description, price, currency, sort_order, is_available
      )
      values (
        v_tenant_id,
        v_category_id,
        jsonb_build_object('pt', v_product ->> 'name'),
        jsonb_build_object('pt', coalesce(v_product ->> 'description', '')),
        (v_product ->> 'price')::numeric,
        'AOA',
        v_product_order,
        true
      );
    end if;
  end loop;
end;
$$;

commit;
