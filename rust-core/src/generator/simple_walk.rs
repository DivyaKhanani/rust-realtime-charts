use super::random_walk::RandomWalkGenerator;

pub fn gen_random_walk_vec(pairs: usize, seed: Option<i32>, bias: f64) -> Vec<f32> {
    let mut gen = RandomWalkGenerator::new(Some(bias));
    if let Some(s) = seed {
        gen.set_seed(s);
    }

    let mut out = Vec::with_capacity(pairs * 2);

    for _ in 0..pairs {
        let random_value = (gen.next_seeded() - 1) as f64 / 2147483646.0;
        let next = gen.last + (random_value - 0.5 + gen.bias);

        out.push(gen.i as f32);
        out.push(next as f32);

        gen.i += 1;
        gen.last = next;
    }

    out
}
