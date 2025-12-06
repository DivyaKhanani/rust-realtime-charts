pub fn lttb_downsample(data: &[f32], threshold: usize) -> Vec<f32> {
    let pair_count = data.len() / 2;

    if threshold >= pair_count || threshold == 0 || pair_count <= 3 {
        return data.to_vec();
    }

    let mut sampled = Vec::with_capacity(threshold * 2);

    sampled.extend_from_slice(&data[0..2]); // first point

    let bucket_size = (pair_count - 2) as f32 / (threshold as f32 - 2.0);

    let mut a = 0usize;
    for i in 0..(threshold - 2) {
        let start = ((i as f32 * bucket_size).floor() as usize) + 1;
        let end = (((i + 1) as f32 * bucket_size).floor() as usize) + 1;
        let end = end.min(pair_count - 1);

        let next_start = end + 1;
        let next_end = (((i + 2) as f32 * bucket_size).floor() as usize) + 1;
        let next_end = next_end.min(pair_count);

        let mut avg_x = 0.0_f32;
        let mut avg_y = 0.0_f32;
        let mut avg_count = 0usize;

        for b in next_start..next_end {
            avg_x += data[b * 2];
            avg_y += data[b * 2 + 1];
            avg_count += 1;
        }

        if avg_count > 0 {
            avg_x /= avg_count as f32;
            avg_y /= avg_count as f32;
        } else {
            avg_x = data[end * 2];
            avg_y = data[end * 2 + 1];
        }

        let ax = data[a * 2];
        let ay = data[a * 2 + 1];

        let mut max_area = -1.0_f32;
        let mut max_idx = start;

        for j in start..=end {
            let bx = data[j * 2];
            let by = data[j * 2 + 1];
            let area =
                ((ax - avg_x) * (by - avg_y) - (ay - avg_y) * (bx - avg_x)).abs() * 0.5_f32;

            if area > max_area {
                max_area = area;
                max_idx = j;
            }
        }

        sampled.push(data[max_idx * 2]);
        sampled.push(data[max_idx * 2 + 1]);
        a = max_idx;
    }

    sampled.extend_from_slice(&data[(pair_count - 1) * 2..pair_count * 2]);
    sampled
}
